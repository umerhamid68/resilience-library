////////////////////////////////////////////////////////////using parameter passing logic
import { RateLimitingStrategy } from './RateLimitingStrategy';
import rocksdb from 'rocksdb';
import { Mutex } from 'async-mutex';
import { FixedWindowCounterOptions } from './RateLimitingStrategyOptions';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
export module FixedWindowCounterStrategy {
    export class FixedWindowCounterStrategy implements RateLimitingStrategy {
        private maxRequests: number;
        private windowSizeInMillis: number;
        private db: rocksdb;
        private key: string;
        private dbReady: Promise<void>;
        private mutex: Mutex;

        constructor(options: FixedWindowCounterOptions) {
            this.maxRequests = options.maxRequests;
            this.windowSizeInMillis = options.windowSizeInMillis || 60000;
            this.key = options.key;
            const dbPath = join(__dirname, 'db', 'FixedWindowCounter');
            if (!existsSync(dbPath)) {
                mkdirSync(dbPath, { recursive: true });
            }
            
            this.db = rocksdb(dbPath);
            this.mutex = new Mutex();
            this.dbReady = new Promise((resolve, reject) => {
                this.db.open({ create_if_missing: true }, async (err) => {
                    if (err) {
                        console.log(`failed to open database: ${err}`);
                        reject(err);
                    } else {
                        console.log('database opened.');
                        await this.resetKeyIfExists();
                        resolve();
                    }
                });
            });
        }
        private async resetKeyIfExists(): Promise<void> {
            return this.mutex.runExclusive(async () => {
                return new Promise<void>((resolve, reject) => {
                    this.db.get(this.key, (err, value) => {
                        if (err && err.message.includes('NotFound')) {
                            console.log(`key not in DB. making new bucket state.`);
                            resolve();
                        } else if (!err) {
                            console.log(`Existing key detected. Deleting key: ${this.key}`);
                            this.db.del(this.key, {}, (delErr) => {
                                if (delErr) {
                                    reject(delErr);
                                } else {
                                    console.log(`Key deleted: ${this.key}`);
                                    resolve();
                                }
                            });
                        } else {
                            reject(err);
                        }
                    });
                });
            });
        }

        private async getWindowState(): Promise<{ startTime: number, requestCount: number }> {
            return this.mutex.runExclusive(async () => {
                return new Promise<{ startTime: number, requestCount: number }>((resolve, reject) => {
                    this.db.get(this.key, (err, value) => {
                        if (err) {
                            if (err.message.includes('NotFound')) {
                                console.log(`key not found in DB. making new window state.`);
                                resolve({ startTime: Date.now(), requestCount: 0 });
                            } else {
                                reject(err);
                            }
                        } else {
                            try {
                                const [startTimeStr, requestCountStr] = value.toString().split(':');
                                const startTime = Number(startTimeStr);
                                const requestCount = Number(requestCountStr);
                                if (isNaN(startTime) || isNaN(requestCount)) {
                                    throw new Error('invalid data format');
                                }
                                console.log(`-- gotten state from DB - Key: ${this.key}, StartTime: ${startTime}, RequestCount: ${requestCount}`);
                                resolve({ startTime, requestCount });
                            } catch (error) {
                                console.log(`error parsing data: ${value.toString()}`);
                                reject(new Error('invalid data format'));
                            }
                        }
                    });
                });
            });
        }

        private async updateWindowState(startTime: number, requestCount: number): Promise<void> {
            return this.mutex.runExclusive(async () => {
                return new Promise<void>((resolve, reject) => {
                    const data = `${startTime}:${requestCount}`;
                    this.db.put(this.key, data, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            console.log(`-- updated state in DB - Key: ${this.key}, Data: ${data}`);
                            resolve();
                        }
                    });
                });
            });
        }

        private async evaluate(clientId: string, updateState: boolean): Promise<boolean> {
            await this.dbReady;
            const currentTimeMillis = Date.now();
            const { startTime, requestCount } = await this.getWindowState();
            const remainingTime = Math.max(0, this.windowSizeInMillis - (currentTimeMillis - startTime));
            //console.log('here4');
            if (!updateState) {
                console.log(`Client ${clientId} check - Current request count: ${requestCount}, Time until window reset: ${remainingTime}ms`);
            }
        
            if (currentTimeMillis - startTime >= this.windowSizeInMillis) {
                if (updateState) {
                    await this.updateWindowState(currentTimeMillis, 1);
                    console.log(`New window started for client ${clientId}.`);
                }
                return true;
            }
        
            if (requestCount >= this.maxRequests) {
                console.log(`Rate limit exceeded for client ${clientId}.`);
                return false;
            }
        
            if (updateState) {
                await this.updateWindowState(startTime, requestCount + 1);
                console.log(`Request allowed for client ${clientId}. Current request count: ${requestCount + 1}`);
            }
            return true;
        }        

        async hit(clientId: string): Promise<boolean> {
            //console.log('here3');
            return this.evaluate(clientId, true);
        }

        async check(clientId: string): Promise<boolean> {
            return this.evaluate(clientId, false);
        }
    }
}
