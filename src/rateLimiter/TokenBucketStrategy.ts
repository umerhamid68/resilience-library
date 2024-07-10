/////////////////////////////////////////////////////////using async mutex library
import { RateLimitingStrategy } from './RateLimitingStrategy';
import rocksdb from 'rocksdb';
import { Mutex } from 'async-mutex';
import { LoggingAdapter } from '../adapters/LoggingAdapter';
import { TelemetryAdapter } from '../adapters/TelemetryAdapter';

export module TokenBucketStrategy {
    export class TokenBucketStrategy implements RateLimitingStrategy {
        private maxTokens: number;
        private refillRate: number; //per second
        private db: rocksdb;
        private key: string;
        private resetThresholdInMillis: number;
        private dbReady: Promise<void>;
        private mutex: Mutex;

        constructor(maxTokens: number, refillRate: number, dbPath: string, key: string, resetThresholdInMillis: number = 3600000, loggingAdapter: LoggingAdapter, telemetryAdapter: TelemetryAdapter) {
            this.maxTokens = maxTokens;
            this.refillRate = refillRate;
            this.key = key;
            this.resetThresholdInMillis = resetThresholdInMillis;
            this.db = rocksdb(dbPath);
            this.mutex = new Mutex();
            this.dbReady = new Promise((resolve, reject) => {
                this.db.open({ create_if_missing: true }, (err) => {
                    if (err) {
                        console.error('failed to opendatabase:', err);
                        reject(err);
                    } else {
                        console.log('database open.');
                        resolve();
                    }
                });
            });
        }

        private async refill() {
            await this.dbReady;
            //console.log('here 3');
                const now = Date.now();
                const { tokens, lastRefill } = await this.getBucketState();
                const elapsed = (now - lastRefill) / 1000;

                if (now - lastRefill > this.resetThresholdInMillis) {
                    console.log(`time ${elapsed}s exceeds threshold. resetting`); //reset last refill time
                    await this.updateBucketState(this.maxTokens, now);
                    console.log(`refilled 0 tokens (reset), new token count: ${this.maxTokens}`);
                } else {
                    const refillAmount = Math.max(0, Math.floor(elapsed * this.refillRate));
                    const newTokens = Math.min(this.maxTokens, tokens + refillAmount);
                    await this.updateBucketState(newTokens, now);
                    console.log(`refilled ${refillAmount} tokens (${elapsed}s), new token count: ${newTokens}`);
                }
            
        }

        private async getBucketState(): Promise<{ tokens: number, lastRefill: number }> {
            //await this.dbReady;
            return this.mutex.runExclusive(async () => {
                return new Promise<{ tokens: number, lastRefill: number }>((resolve, reject) => {
                    this.db.get(this.key, (err, value) => {
                        if (err) {
                            if (err.message.includes('NotFound')) {
                                console.log(`key notin DB. making new bucket state.`);
                                resolve({ tokens: this.maxTokens, lastRefill: Date.now() });
                            } else {
                                reject(err);
                            }
                        } else {
                            try {
                                const [tokensStr, lastRefillStr] = value.toString().split(':');
                                const tokens = Number(tokensStr);
                                const lastRefill = Number(lastRefillStr);
                                if (isNaN(tokens) || isNaN(lastRefill)) {
                                    throw new Error('invalid data format');
                                }
                                console.log(`-- gotten state from DB:: key: ${this.key}, tokens: ${tokens}, last Refill: ${lastRefill}`);
                                resolve({ tokens, lastRefill });
                            } catch (error) {
                                console.error(`error parsing data: ${value.toString()}`);
                                reject(new Error('invalid data format'));
                            }
                        }
                    });
                });
            });
        }

        private async updateBucketState(tokens: number, lastRefill: number): Promise<void> {
            //await this.dbReady;
            return this.mutex.runExclusive(async () => {
                return new Promise<void>((resolve, reject) => {
                    const data = `${tokens}:${lastRefill}`;
                    this.db.put(this.key, data, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            console.log(`-- updated state in DB:: key: ${this.key}, data: ${data}`);
                            resolve();
                        }
                    });
                });
            });
        }

        async hit(clientId: string): Promise<boolean> {
            if (!clientId) {
                throw new Error('clientId cannot be null');
            }

            await this.refill();
            const { tokens } = await this.getBucketState();
            console.log(`client ${clientId} is trying to hit. Current tokens: ${tokens}`);
            if (tokens > 0) {
                await this.updateBucketState(tokens - 1, Date.now());
                console.log(`client ${clientId} hit successful. Tokens left: ${tokens - 1}`);
                return true;
            }
            console.log(`client ${clientId} hit failed. No tokens left.`);
            return false;
        }

        async check(clientId: string): Promise<boolean> {
            if (!clientId) {
                throw new Error('clientId cannot be null');
            }
            await this.refill();
            const { tokens } = await this.getBucketState();
            console.log(`check if client ${clientId} can hit. current tokens: ${tokens}`);
            return tokens > 0;
        }
    }
}


