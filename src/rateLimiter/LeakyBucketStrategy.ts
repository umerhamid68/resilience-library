////////////////////////////////////////with additional reset time parameter like in gubernator
/*import { RateLimitingStrategy } from './RateLimitingStrategy';
import rocksdb from 'rocksdb';
import { Mutex } from 'async-mutex';
import { LoggingAdapter } from '../adapters/LoggingAdapter';
import { TelemetryAdapter } from '../adapters/TelemetryAdapter';

export module LeakyBucketStrategy {
    export class LeakyBucketStrategy implements RateLimitingStrategy {
        private maxRequests: number;
        private db: rocksdb;
        private key: string;
        private resetThresholdInMillis: number;
        private dbReady: Promise<void>;
        private mutex: Mutex;
        private loggingAdapter: LoggingAdapter;
        private telemetryAdapter: TelemetryAdapter;

        constructor(maxRequests: number, dbPath: string, key: string, resetThresholdInMillis: number = 3600000, loggingAdapter: LoggingAdapter, telemetryAdapter: TelemetryAdapter) {
            this.maxRequests = maxRequests;
            this.key = key;
            this.resetThresholdInMillis = resetThresholdInMillis;
            this.db = rocksdb(dbPath);
            this.mutex = new Mutex();
            this.loggingAdapter = loggingAdapter;
            this.telemetryAdapter = telemetryAdapter;
            this.dbReady = new Promise((resolve, reject) => {
                this.db.open({ create_if_missing: true }, (err) => {
                    if (err) {
                        this.loggingAdapter.log(`failed to opendatabase: ${err}`)
                        console.error('failed to open database:', err);
                        reject(err);
                    } else {
                        this.loggingAdapter.log('database opened.');
                        resolve();
                    }
                });
            });
        }

        private async getQueueState(): Promise<{ queue: string[], lastProcessed: number }> {
            await this.dbReady;
            return this.mutex.runExclusive(async () => {
                return new Promise<{ queue: string[], lastProcessed: number }>((resolve, reject) => {
                    this.db.get(this.key, (err, value) => {
                        if (err) {
                            if (err.message.includes('NotFound')) {
                                this.loggingAdapter.log(`Key not found in DB. Making new queue state.`);
                                resolve({ queue: [], lastProcessed: Date.now() });
                            } else {
                                reject(err);
                            }
                        } else {
                            try {
                                const [queueStr, lastProcessedStr] = value.toString().split('|');
                                const queue = queueStr.split(':').filter(Boolean);
                                const lastProcessed = Number(lastProcessedStr);
                                if (isNaN(lastProcessed)) {
                                    throw new Error('invalid data format');
                                }
                                this.loggingAdapter.log(`--gotten state from DB - Key: ${this.key}, Queue: ${queue}, Last Processed: ${lastProcessed}`);
                                resolve({ queue, lastProcessed });
                            } catch (error) {
                                this.loggingAdapter.log(`error parsing data: ${value.toString()}`);
                                console.error(`error parsing data: ${value.toString()}`);
                                reject(new Error('Invalid data format'));
                            }
                        }
                    });
                });
            });
        }

        private async updateQueueState(queue: string[], lastProcessed: number): Promise<void> {
            await this.dbReady;
            return this.mutex.runExclusive(async () => {
                return new Promise<void>((resolve, reject) => {
                    const data = `${queue.join(':')}|${lastProcessed}`;
                    this.db.put(this.key, data, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            this.loggingAdapter.log(`--updated state in DB - Key: ${this.key}, Data: ${data}`);
                            resolve();
                        }
                    });
                });
            });
        }

        private async resetIfNeeded() {
            const now = Date.now();
            const { queue, lastProcessed } = await this.getQueueState();
            const elapsed = now - lastProcessed;

            if (elapsed > this.resetThresholdInMillis) {
                this.loggingAdapter.log(`elapsed time ${elapsed}ms exceeds threshold. resetting queue.`);
                await this.updateQueueState([], now);
                this.loggingAdapter.log(`queue reset due to elapsed time. New lastprocessed time: ${now}`);
            }
        }

        async hit(clientId: string): Promise<boolean> {
            if (!clientId) {
                throw new Error('clientId cannot be null or undefined');
            }

            await this.resetIfNeeded();
            const { queue } = await this.getQueueState();

            if (queue.length < this.maxRequests) {
                queue.push(clientId);
                await this.updateQueueState(queue, Date.now());
                this.loggingAdapter.log(`client ${clientId} added to the queue. Queue size: ${queue.length}`);
                return true;
            } else {
                this.loggingAdapter.log(`client ${clientId} request discarded. Queue is full.`);
                return false;
            }
        }

        async check(clientId: string): Promise<boolean> {
            if (!clientId) {
                throw new Error('clientId cannot be null or undefined');
            }
            await this.resetIfNeeded();
            const { queue } = await this.getQueueState();
            this.loggingAdapter.log(`checking if client ${clientId} can be added to the queue. Queue size: ${queue.length}`);
            return queue.length < this.maxRequests;
        }

        // async processRequests(): Promise<void> {
        //     await this.dbReady;
        //     const { queue } = await this.getQueueState();
        //     if (queue.length > 0) {
        //         const clientId = queue.shift();
        //         if (clientId) {
        //             await this.updateQueueState(queue, Date.now());
        //             await new Promise<void>((resolve, reject) => {
        //                 this.db.put(clientId, 'processed', (err) => {
        //                     if (err) {
        //                         console.error('failed to process request:', err);
        //                         reject(err);
        //                     } else {
        //                         this.loggingAdapter.log(`processed request for client: ${clientId}`);
        //                         resolve();
        //                     }
        //                 });
        //             });
        //         }
        //     }
        // }
    }
}
*/
///////////////////////////////////////////using parameter passing logic
import { RateLimitingStrategy } from './RateLimitingStrategy';
import rocksdb from 'rocksdb';
import { Mutex } from 'async-mutex';
import { LoggingAdapter } from '../adapters/LoggingAdapter';
import { TelemetryAdapter } from '../adapters/TelemetryAdapter';

export module LeakyBucketStrategy {
    export class LeakyBucketStrategy implements RateLimitingStrategy {
        private maxRequests: number;
        private db: rocksdb;
        private key: string;
        private resetThresholdInMillis: number;
        private dbReady: Promise<void>;
        private mutex: Mutex;
        private loggingAdapter: LoggingAdapter;
        private telemetryAdapter: TelemetryAdapter;

        constructor(maxRequests: number, dbPath: string, key: string, resetThresholdInMillis: number = 3600000, loggingAdapter: LoggingAdapter, telemetryAdapter: TelemetryAdapter) {
            this.maxRequests = maxRequests;
            this.key = key;
            this.resetThresholdInMillis = resetThresholdInMillis;
            this.db = rocksdb(dbPath);
            this.mutex = new Mutex();
            this.loggingAdapter = loggingAdapter;
            this.telemetryAdapter = telemetryAdapter;
            this.dbReady = new Promise((resolve, reject) => {
                this.db.open({ create_if_missing: true }, async (err) => {
                    if (err) {
                        this.loggingAdapter.log(`failed to open database: ${err}`)
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

        private async getQueueState(): Promise<{ queue: string[], lastProcessed: number }> {
            return this.mutex.runExclusive(async () => {
                return new Promise<{ queue: string[], lastProcessed: number }>((resolve, reject) => {
                    this.db.get(this.key, (err, value) => {
                        if (err) {
                            if (err.message.includes('NotFound')) {
                                this.loggingAdapter.log(`Key not found in DB. Making new queue state.`);
                                resolve({ queue: [], lastProcessed: Date.now() });
                            } else {
                                reject(err);
                            }
                        } else {
                            try {
                                const [queueStr, lastProcessedStr] = value.toString().split('|');
                                const queue = queueStr.split(':').filter(Boolean);
                                const lastProcessed = Number(lastProcessedStr);
                                if (isNaN(lastProcessed)) {
                                    throw new Error('invalid data format');
                                }
                                this.loggingAdapter.log(`--gotten state from DB - Key: ${this.key}, Queue: ${queue}, Last Processed: ${lastProcessed}`);
                                resolve({ queue, lastProcessed });
                            } catch (error) {
                                this.loggingAdapter.log(`error parsing data: ${value.toString()}`);
                                reject(new Error('Invalid data format'));
                            }
                        }
                    });
                });
            });
        }

        private async updateQueueState(queue: string[], lastProcessed: number): Promise<void> {
            return this.mutex.runExclusive(async () => {
                return new Promise<void>((resolve, reject) => {
                    const data = `${queue.join(':')}|${lastProcessed}`;
                    this.db.put(this.key, data, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            this.loggingAdapter.log(`--updated state in DB - Key: ${this.key}, Data: ${data}`);
                            resolve();
                        }
                    });
                });
            });
        }

        private async resetIfNeeded() {
            const now = Date.now();
            const { queue, lastProcessed } = await this.getQueueState();
            const elapsed = now - lastProcessed;

            if (elapsed > this.resetThresholdInMillis) {
                this.loggingAdapter.log(`elapsed time ${elapsed}ms exceeds threshold. resetting queue.`);
                await this.updateQueueState([], now);
                this.loggingAdapter.log(`queue reset due to elapsed time. New last processed time: ${now}`);
            }
        }

        private async evaluate(clientId: string, updateState: boolean): Promise<boolean> {
            await this.dbReady;
            await this.resetIfNeeded();
            const { queue, lastProcessed } = await this.getQueueState();
            const now = Date.now();
            const remainingTime = Math.max(0, this.resetThresholdInMillis - (now - lastProcessed));
        
            if (!updateState) {
                this.loggingAdapter.log(`Client ${clientId} check - Queue size: ${queue.length}, Time until reset: ${remainingTime}ms`);
            }
        
            if (queue.length < this.maxRequests) {
                if (updateState) {
                    queue.push(clientId);
                    await this.updateQueueState(queue, Date.now());
                    this.loggingAdapter.log(`Client ${clientId} added to the queue. Queue size: ${queue.length}`);
                }
                return true;
            } else {
                this.loggingAdapter.log(`Client ${clientId} request discarded. Queue is full.`);
                return false;
            }
        }        

        async hit(clientId: string): Promise<boolean> {
            return this.evaluate(clientId, true);
        }

        async check(clientId: string): Promise<boolean> {
            return this.evaluate(clientId, false);
        }
    }
}


