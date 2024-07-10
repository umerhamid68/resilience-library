/////////////////////////////////////////////////////////semaphore
/*import { RateLimitingStrategy } from './RateLimitingStrategy';
import rocksdb from 'rocksdb';
import { Semaphore } from '../semaphore/Semaphore';
import { LoggingAdapter } from '../adapters/LoggingAdapter';
import { TelemetryAdapter } from '../adapters/TelemetryAdapter';

export module FixedWindowCounterStrategy {
    export class FixedWindowCounterStrategy implements RateLimitingStrategy {
        private maxRequests: number;
        private windowSizeInMillis: number;
        private db: rocksdb;
        private key: string;
        private dbReady: Promise<void>;
        private semaphore: Semaphore;

        constructor(maxRequests: number, windowSizeInMillis: number, dbPath: string, key: string) {
            this.maxRequests = maxRequests;
            this.windowSizeInMillis = windowSizeInMillis;
            this.key = key;
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
            this.semaphore = new Semaphore(1, './internal_semaphore_2', `${key}_semaphore`, new LoggingAdapter(), new TelemetryAdapter());
        }

        private async getWindowState(): Promise<{ startTime: number, requestCount: number }> {
            await this.dbReady;
            await this.semaphore.acquire();
            try {
                return new Promise<{ startTime: number, requestCount: number }>((resolve, reject) => {
                    this.db.get(this.key, (err, value) => {
                        if (err) {
                            if (err.message.includes('NotFound')) {
                                console.log(`Key not found in DB, initializing new window state.`);
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
                                    throw new Error('Invalid data format');
                                }
                                console.log(`Retrieved state from DB - Key: ${this.key}, StartTime: ${startTime}, RequestCount: ${requestCount}`);
                                resolve({ startTime, requestCount });
                            } catch (error) {
                                console.error(`Error parsing data: ${value.toString()}`);
                                reject(new Error('Invalid data format'));
                            }
                        }
                    });
                });
            } finally {
                await this.semaphore.release();
            }
        }

        private async updateWindowState(startTime: number, requestCount: number): Promise<void> {
            await this.dbReady;
            await this.semaphore.acquire();
            try {
                return new Promise<void>((resolve, reject) => {
                    const data = `${startTime}:${requestCount}`;
                    this.db.put(this.key, data, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            console.log(`Updated state in DB - Key: ${this.key}, Data: ${data}`);
                            resolve();
                        }
                    });
                });
            } finally {
                await this.semaphore.release();
            }
        }

        async hit(clientId: string): Promise<boolean> {
            await this.dbReady;
            const currentTimeMillis = Date.now();
            const { startTime, requestCount } = await this.getWindowState();

            if (currentTimeMillis - startTime >= this.windowSizeInMillis) {
                await this.updateWindowState(currentTimeMillis, 1);
                console.log(`New window started for client ${clientId}.`);
                //console.log(`Current request count: ${requestCount}`);
                return true;
            }

            if (requestCount >= this.maxRequests) {
                console.log(`Rate limit exceeded for client ${clientId}.`);
                return false;
            }
            await this.updateWindowState(startTime, requestCount + 1);
            console.log(`Request allowed for client ${clientId}. Current request count: ${requestCount + 1}`);
            return true;
        }

        async check(clientId: string): Promise<boolean> {
            await this.dbReady;
            const currentTimeMillis = Date.now();
            const { startTime, requestCount } = await this.getWindowState();

            if (currentTimeMillis - startTime >= this.windowSizeInMillis) {
                console.log(`New window would start for client ${clientId}. Request would be allowed.`);
                return true;
            }

            if (requestCount < this.maxRequests) {
                console.log(`Request would be allowed for client ${clientId}. Current request count: ${requestCount}`);
                return true;
            }
            console.log(`Request would be denied for client ${clientId}.`);
            return false;
        }
    }
}
*/



//////////////////////////////////////////////////////////////using async mutex library
import { RateLimitingStrategy } from './RateLimitingStrategy';
import rocksdb from 'rocksdb';
import { Mutex } from 'async-mutex';
import { LoggingAdapter } from '../adapters/LoggingAdapter';
import { TelemetryAdapter } from '../adapters/TelemetryAdapter';

export module FixedWindowCounterStrategy {
    export class FixedWindowCounterStrategy implements RateLimitingStrategy {
        private maxRequests: number;
        private windowSizeInMillis: number;
        private db: rocksdb;
        private key: string;
        private dbReady: Promise<void>;
        private mutex: Mutex;

        constructor(maxRequests: number, windowSizeInMillis: number, dbPath: string, key: string) {
            this.maxRequests = maxRequests;
            this.windowSizeInMillis = windowSizeInMillis;
            this.key = key;
            this.db = rocksdb(dbPath);
            this.mutex = new Mutex();
            this.dbReady = new Promise((resolve, reject) => {
                this.db.open({ create_if_missing: true }, (err) => {
                    if (err) {
                        console.error('failed to open database:', err);
                        reject(err);
                    } else {
                        console.log('database opened.');
                        resolve();
                    }
                });
            });
        }

        private async getWindowState(): Promise<{ startTime: number, requestCount: number }> {
            //await this.dbReady;
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
                                console.log(`-- gotton state from DB - Key: ${this.key}, StartTime: ${startTime}, RequestCount: ${requestCount}`);
                                resolve({ startTime, requestCount });
                            } catch (error) {
                                console.error(`error parsing data: ${value.toString()}`);
                                reject(new Error('invalid data format'));
                            }
                        }
                    });
                });
            });
        }

        private async updateWindowState(startTime: number, requestCount: number): Promise<void> {
            //await this.dbReady;
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

        async hit(clientId: string): Promise<boolean> {
            await this.dbReady;
            const currentTimeMillis = Date.now();
            const { startTime, requestCount } = await this.getWindowState();

            if (currentTimeMillis - startTime >= this.windowSizeInMillis) {
                await this.updateWindowState(currentTimeMillis, 1);
                console.log(`New window started for client ${clientId}.`);
                return true;
            }

            if (requestCount >= this.maxRequests) {
                console.log(`rate limit exceeded for client ${clientId}.`);
                return false;
            }
            await this.updateWindowState(startTime, requestCount + 1);
            console.log(`request allowed for client ${clientId}. Current request count: ${requestCount + 1}`);
            return true;
        }

        async check(clientId: string): Promise<boolean> {
            await this.dbReady;
            const currentTimeMillis = Date.now();
            const { startTime, requestCount } = await this.getWindowState();

            if (currentTimeMillis - startTime >= this.windowSizeInMillis) {
                console.log(`new window would start for client ${clientId}.Request would be allowed.`);
                return true;
            }

            if (requestCount < this.maxRequests) {
                console.log(`Request would be allowed for client ${clientId}. Current request count: ${requestCount}`);
                return true;
            }
            console.log(`Request would be denied for client ${clientId}.`);
            return false;
        }
    }
}
