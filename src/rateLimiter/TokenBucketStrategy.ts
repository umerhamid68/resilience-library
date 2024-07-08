///////////////////////////////////////////////////////// with db ready state
import { RateLimitingStrategy } from './RateLimitingStrategy';
import rocksdb from 'rocksdb';

export module TokenBucketStrategy {
    export class TokenBucketStrategy implements RateLimitingStrategy {
        private maxTokens: number;
        private refillRate: number; //per second
        private db: rocksdb;
        private key: string;
        private resetThresholdInMillis: number;
        private dbReady: Promise<void>;

        constructor(maxTokens: number, refillRate: number, dbPath: string, key: string, resetThresholdInMillis: number = 3600000) {
            this.maxTokens = maxTokens;
            this.refillRate = refillRate;
            this.key = key;
            this.resetThresholdInMillis = resetThresholdInMillis;
            this.db = rocksdb(dbPath);
            this.dbReady = new Promise((resolve, reject) => {
                this.db.open({ create_if_missing: true }, (err) => {
                    if (err) {
                        console.error('Failed to open the database:', err);
                        reject(err);
                    } else {
                        console.log('Database opened successfully.');
                        resolve();
                    }
                });
            });
        }

        private async refill() {
            await this.dbReady;
            const now = Date.now();
            const { tokens, lastRefill } = await this.getBucketState();
            const elapsed = (now - lastRefill) / 1000;

            if (now - lastRefill > this.resetThresholdInMillis) {
                console.log(`Elapsed time ${elapsed}s exceeds threshold. Resetting last refill time.`);
                await this.updateBucketState(this.maxTokens, now);
                console.log(`Refilled 0 tokens (reset due to elapsed time), new token count: ${this.maxTokens}`);
            } else {
                const refillAmount = Math.max(0, Math.floor(elapsed * this.refillRate));
                const newTokens = Math.min(this.maxTokens, tokens + refillAmount);
                await this.updateBucketState(newTokens, now);
                console.log(`Refilled ${refillAmount} tokens (elapsed: ${elapsed}s), new token count: ${newTokens}`);
            }
        }

        private async getBucketState(): Promise<{ tokens: number, lastRefill: number }> {
            await this.dbReady;
            return new Promise<{ tokens: number, lastRefill: number }>((resolve, reject) => {
                this.db.get(this.key, (err, value) => {
                    if (err) {
                        if (err.message.includes('NotFound')) {
                            console.log(`Key not found in DB, initializing new bucket state.`);
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
                                throw new Error('Invalid data format');
                            }
                            console.log(`Retrieved state from DB - Key: ${this.key}, Tokens: ${tokens}, Last Refill: ${lastRefill}`);
                            resolve({ tokens, lastRefill });
                        } catch (error) {
                            console.error(`Error parsing data: ${value.toString()}`);
                            reject(new Error('Invalid data format'));
                        }
                    }
                });
            });
        }

        private async updateBucketState(tokens: number, lastRefill: number): Promise<void> {
            await this.dbReady;
            return new Promise<void>((resolve, reject) => {
                const data = `${tokens}:${lastRefill}`;
                this.db.put(this.key, data, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log(`Updated state in DB - Key: ${this.key}, Data: ${data}`);
                        resolve();
                    }
                });
            });
        }

        async hit(clientId: string): Promise<boolean> {
            if (!clientId) {
                throw new Error('clientId cannot be null or undefined');
            }

            await this.refill();
            const { tokens } = await this.getBucketState();
            console.log(`Client ${clientId} is trying to hit. Current tokens: ${tokens}`);
            if (tokens > 0) {
                await this.updateBucketState(tokens - 1, Date.now());
                console.log(`Client ${clientId} hit successful. Tokens left: ${tokens - 1}`);
                return true;
            }
            console.log(`Client ${clientId} hit failed. No tokens left.`);
            return false;
        }

        async check(clientId: string): Promise<boolean> {
            if (!clientId) {
                throw new Error('clientId cannot be null or undefined');
            }
            await this.refill();
            const { tokens } = await this.getBucketState();
            console.log(`Checking if client ${clientId} can hit. Current tokens: ${tokens}`);
            return tokens > 0;
        }
    }
}



