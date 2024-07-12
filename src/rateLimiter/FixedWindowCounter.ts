//////////////////////////////////////////////////////////////using async mutex library
/*import { RateLimitingStrategy } from './RateLimitingStrategy';
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
        private loggingAdapter: LoggingAdapter; 
        private telemetryAdapter: TelemetryAdapter;

        constructor(maxRequests: number, windowSizeInMillis: number, dbPath: string, key: string, loggingAdapter: LoggingAdapter, telemetryAdapter: TelemetryAdapter) {
            this.maxRequests = maxRequests;
            this.windowSizeInMillis = windowSizeInMillis;
            this.key = key;
            this.db = rocksdb(dbPath);
            this.mutex = new Mutex();
            this.loggingAdapter = loggingAdapter;
            this.telemetryAdapter = telemetryAdapter;
            this.dbReady = new Promise((resolve, reject) => {
                this.db.open({ create_if_missing: true }, (err) => {
                    if (err) {
                        this.loggingAdapter.log(`failed to opendatabase: ${err}`);
                        console.error('failed to open database:', err);
                        reject(err);
                    } else {
                        this.loggingAdapter.log('database opened.');
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
                                this.loggingAdapter.log(`key not found in DB. making new window state.`);
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
                                this.loggingAdapter.log(`-- gotton state from DB - Key: ${this.key}, StartTime: ${startTime}, RequestCount: ${requestCount}`);
                                resolve({ startTime, requestCount });
                            } catch (error) {
                                this.loggingAdapter.log(`error parsing data: ${value.toString()}`);
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
                            this.loggingAdapter.log(`-- updated state in DB - Key: ${this.key}, Data: ${data}`);
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
                this.loggingAdapter.log(`New window started for client ${clientId}.`);
                return true;
            }

            if (requestCount >= this.maxRequests) {
                this.loggingAdapter.log(`rate limit exceeded for client ${clientId}.`);
                return false;
            }
            await this.updateWindowState(startTime, requestCount + 1);
            this.loggingAdapter.log(`request allowed for client ${clientId}. Current request count: ${requestCount + 1}`);
            return true;
        }

        async check(clientId: string): Promise<boolean> {
            await this.dbReady;
            const currentTimeMillis = Date.now();
            const { startTime, requestCount } = await this.getWindowState();

            if (currentTimeMillis - startTime >= this.windowSizeInMillis) {
                this.loggingAdapter.log(`new window would start for client ${clientId}.Request would be allowed.`);
                return true;
            }

            if (requestCount < this.maxRequests) {
                this.loggingAdapter.log(`Request would be allowed for client ${clientId}. Current request count: ${requestCount}`);
                return true;
            }
            this.loggingAdapter.log(`Request would be denied for client ${clientId}.`);
            return false;
        }
    }
}
*/


////////////////////////////////////////////////////////////using parameter passing logic
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
        private loggingAdapter: LoggingAdapter; 
        private telemetryAdapter: TelemetryAdapter;

        constructor(maxRequests: number, windowSizeInMillis: number, dbPath: string, key: string, loggingAdapter: LoggingAdapter, telemetryAdapter: TelemetryAdapter) {
            this.maxRequests = maxRequests;
            this.windowSizeInMillis = windowSizeInMillis;
            this.key = key;
            this.db = rocksdb(dbPath);
            this.mutex = new Mutex();
            this.loggingAdapter = loggingAdapter;
            this.telemetryAdapter = telemetryAdapter;
            this.dbReady = new Promise((resolve, reject) => {
                this.db.open({ create_if_missing: true }, async (err) => {
                    if (err) {
                        this.loggingAdapter.log(`failed to open database: ${err}`);
                        reject(err);
                    } else {
                        this.loggingAdapter.log('database opened.');
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
                            this.loggingAdapter.log(`key not in DB. making new bucket state.`);
                            resolve();
                        } else if (!err) {
                            this.loggingAdapter.log(`Existing key detected. Deleting key: ${this.key}`);
                            this.db.del(this.key, {}, (delErr) => {
                                if (delErr) {
                                    reject(delErr);
                                } else {
                                    this.loggingAdapter.log(`Key deleted: ${this.key}`);
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
                                this.loggingAdapter.log(`key not found in DB. making new window state.`);
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
                                this.loggingAdapter.log(`-- gotten state from DB - Key: ${this.key}, StartTime: ${startTime}, RequestCount: ${requestCount}`);
                                resolve({ startTime, requestCount });
                            } catch (error) {
                                this.loggingAdapter.log(`error parsing data: ${value.toString()}`);
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
                            this.loggingAdapter.log(`-- updated state in DB - Key: ${this.key}, Data: ${data}`);
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
                this.loggingAdapter.log(`Client ${clientId} check - Current request count: ${requestCount}, Time until window reset: ${remainingTime}ms`);
            }
        
            if (currentTimeMillis - startTime >= this.windowSizeInMillis) {
                if (updateState) {
                    await this.updateWindowState(currentTimeMillis, 1);
                    this.loggingAdapter.log(`New window started for client ${clientId}.`);
                }
                return true;
            }
        
            if (requestCount >= this.maxRequests) {
                this.loggingAdapter.log(`Rate limit exceeded for client ${clientId}.`);
                return false;
            }
        
            if (updateState) {
                await this.updateWindowState(startTime, requestCount + 1);
                this.loggingAdapter.log(`Request allowed for client ${clientId}. Current request count: ${requestCount + 1}`);
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
