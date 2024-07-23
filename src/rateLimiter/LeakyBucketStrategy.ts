// ///////////////////////////////////////////using parameter passing logic
// import { RateLimitingStrategy } from './RateLimitingStrategy';
// import rocksdb from 'rocksdb';
// import { Mutex } from 'async-mutex';
// import { LeakyBucketOptions } from './RateLimitingStrategyOptions';
// import { join } from 'path';
// import { existsSync, mkdirSync } from 'fs';
// export module LeakyBucketStrategy {
//     export class LeakyBucketStrategy implements RateLimitingStrategy {
//         private maxRequests: number;
//         private db: rocksdb;
//         private key: string;
//         private resetThresholdInMillis: number;
//         private dbReady: Promise<void>;
//         private mutex: Mutex;

//         constructor(options: LeakyBucketOptions) {
//             this.maxRequests = options.maxRequests;
//             this.key = options.key;
//             this.resetThresholdInMillis = options.resetThresholdInMillis || 60000;
//             const dbPath = join(__dirname, 'db', 'LeakyBucket');
//             if (!existsSync(dbPath)) {
//                 mkdirSync(dbPath, { recursive: true });
//             }
//             this.db = rocksdb(dbPath);
//             this.mutex = new Mutex();
//             this.dbReady = new Promise((resolve, reject) => {
//                 this.db.open({ create_if_missing: true }, async (err) => {
//                     if (err) {
//                         console.log(`failed to open database: ${err}`)
//                         reject(err);
//                     } else {
//                         console.log('database opened.');
//                         await this.resetKeyIfExists();
//                         resolve();
//                     }
//                 });
//             });
//         }
//         private async resetKeyIfExists(): Promise<void> {
//             return this.mutex.runExclusive(async () => {
//                 return new Promise<void>((resolve, reject) => {
//                     this.db.get(this.key, (err, value) => {
//                         if (err && err.message.includes('NotFound')) {
//                             console.log(`key not in DB. making new bucket state.`);
//                             resolve();
//                         } else if (!err) {
//                             console.log(`Existing key detected. Deleting key: ${this.key}`);
//                             this.db.del(this.key, {}, (delErr) => {
//                                 if (delErr) {
//                                     reject(delErr);
//                                 } else {
//                                     console.log(`Key deleted: ${this.key}`);
//                                     resolve();
//                                 }
//                             });
//                         } else {
//                             reject(err);
//                         }
//                     });
//                 });
//             });
//         }

//         private async getQueueState(): Promise<{ queue: string[], lastProcessed: number }> {
//             return this.mutex.runExclusive(async () => {
//                 return new Promise<{ queue: string[], lastProcessed: number }>((resolve, reject) => {
//                     this.db.get(this.key, (err, value) => {
//                         if (err) {
//                             if (err.message.includes('NotFound')) {
//                                 console.log(`Key not found in DB. Making new queue state.`);
//                                 resolve({ queue: [], lastProcessed: Date.now() });
//                             } else {
//                                 reject(err);
//                             }
//                         } else {
//                             try {
//                                 const [queueStr, lastProcessedStr] = value.toString().split('|');
//                                 const queue = queueStr.split(':').filter(Boolean);
//                                 const lastProcessed = Number(lastProcessedStr);
//                                 if (isNaN(lastProcessed)) {
//                                     throw new Error('invalid data format');
//                                 }
//                                 console.log(`--gotten state from DB - Key: ${this.key}, Queue: ${queue}, Last Processed: ${lastProcessed}`);
//                                 resolve({ queue, lastProcessed });
//                             } catch (error) {
//                                 console.log(`error parsing data: ${value.toString()}`);
//                                 reject(new Error('Invalid data format'));
//                             }
//                         }
//                     });
//                 });
//             });
//         }

//         private async updateQueueState(queue: string[], lastProcessed: number): Promise<void> {
//             return this.mutex.runExclusive(async () => {
//                 return new Promise<void>((resolve, reject) => {
//                     const data = `${queue.join(':')}|${lastProcessed}`;
//                     this.db.put(this.key, data, (err) => {
//                         if (err) {
//                             reject(err);
//                         } else {
//                             console.log(`--updated state in DB - Key: ${this.key}, Data: ${data}`);
//                             resolve();
//                         }
//                     });
//                 });
//             });
//         }

//         private async resetIfNeeded() {
//             const now = Date.now();
//             const { queue, lastProcessed } = await this.getQueueState();
//             const elapsed = now - lastProcessed;

//             if (elapsed > this.resetThresholdInMillis) {
//                 console.log(`elapsed time ${elapsed}ms exceeds threshold. resetting queue.`);
//                 await this.updateQueueState([], now);
//                 console.log(`queue reset due to elapsed time. New last processed time: ${now}`);
//             }
//         }

//         private async evaluate(clientId: string, updateState: boolean): Promise<boolean> {
//             await this.dbReady;
//             await this.resetIfNeeded();
//             const { queue, lastProcessed } = await this.getQueueState();
//             const now = Date.now();
//             const remainingTime = Math.max(0, this.resetThresholdInMillis - (now - lastProcessed));
        
//             if (!updateState) {
//                 console.log(`Client ${clientId} check - Queue size: ${queue.length}, Time until reset: ${remainingTime}ms`);
//             }
        
//             if (queue.length < this.maxRequests) {
//                 if (updateState) {
//                     queue.push(clientId);
//                     await this.updateQueueState(queue, Date.now());
//                     console.log(`Client ${clientId} added to the queue. Queue size: ${queue.length}`);
//                 }
//                 return true;
//             } else {
//                 console.log(`Client ${clientId} request discarded. Queue is full.`);
//                 return false;
//             }
//         }        

//         async hit(clientId: string): Promise<boolean> {
//             return this.evaluate(clientId, true);
//         }

//         async check(clientId: string): Promise<boolean> {
//             return this.evaluate(clientId, false);
//         }
//     }
// }


///////////////////////////database abstraction
// import { RateLimitingStrategy } from './RateLimitingStrategy';
// import { Database } from '../Database';
// import { LeakyBucketOptions } from './RateLimitingStrategyOptions';

// export module LeakyBucketStrategy {
//     export class LeakyBucketStrategy implements RateLimitingStrategy {
//         private maxRequests: number;
//         private key: string;
//         private resetThresholdInMillis: number;
//         private db: Database;

//         constructor(options: LeakyBucketOptions) {
//             this.maxRequests = options.maxRequests;
//             this.key = options.key;
//             this.resetThresholdInMillis = options.resetThresholdInMillis || 60000;
//             this.db = Database.getInstance();

//             // Ensure database is initialized before proceeding
//             this.initialize().catch(err => console.error(`Error initializing LeakyBucketStrategy: ${err}`));
//         }

//         private async initialize() {
//             await this.db.waitForInitialization();
//             await this.resetKeyIfExists();
//         }

//         private async resetKeyIfExists(): Promise<void> {
//             const value = await this.db.get(this.key);
//             if (value !== null) {
//                 await this.db.del(this.key);
//             }
//         }

//         private async getQueueState(): Promise<{ queue: string[], lastProcessed: number }> {
//             const value = await this.db.get(this.key);
//             if (value === null) {
//                 return { queue: [], lastProcessed: Date.now() };
//             }

//             const [queueStr, lastProcessedStr] = value.split('|');
//             const queue = queueStr.split(':').filter(Boolean);
//             const lastProcessed = Number(lastProcessedStr);
//             if (isNaN(lastProcessed)) {
//                 throw new Error('Invalid data format');
//             }

//             return { queue, lastProcessed };
//         }

//         private async updateQueueState(queue: string[], lastProcessed: number): Promise<void> {
//             const data = `${queue.join(':')}|${lastProcessed}`;
//             await this.db.put(this.key, data);
//         }

//         private async resetIfNeeded() {
//             const now = Date.now();
//             const { queue, lastProcessed } = await this.getQueueState();
//             const elapsed = now - lastProcessed;

//             if (elapsed > this.resetThresholdInMillis) {
//                 await this.updateQueueState([], now);
//             }
//         }

//         private async evaluate(clientId: string, updateState: boolean): Promise<boolean> {
//             await this.resetIfNeeded();
//             const { queue, lastProcessed } = await this.getQueueState();
//             const now = Date.now();
//             const remainingTime = Math.max(0, this.resetThresholdInMillis - (now - lastProcessed));

//             if (!updateState) {
//                 console.log(`Client ${clientId} check - Queue size: ${queue.length}, Time until reset: ${remainingTime}ms`);
//             }

//             if (queue.length < this.maxRequests) {
//                 if (updateState) {
//                     queue.push(clientId);
//                     await this.updateQueueState(queue, Date.now());
//                 }
//                 return true;
//             } else {
//                 console.log(`Client ${clientId} request discarded. Queue is full.`);
//                 return false;
//             }
//         }

//         async hit(clientId: string): Promise<boolean> {
//             return this.evaluate(clientId, true);
//         }

//         async check(clientId: string): Promise<boolean> {
//             return this.evaluate(clientId, false);
//         }
//     }
// }



//////////////////////////////////////////
import { RateLimitingStrategy } from './RateLimitingStrategy';
import { Database } from '../Database';
import { LeakyBucketOptions } from './RateLimitingStrategyOptions';

export module LeakyBucketStrategy {
    export class LeakyBucketStrategy implements RateLimitingStrategy {
        private maxRequests: number;
        private key: string;
        private resetThresholdInMillis: number;
        private db: Database;
        private dbInitialized: Promise<void>;

        constructor(options: LeakyBucketOptions) {
            this.maxRequests = options.maxRequests;
            this.key = options.key;
            this.resetThresholdInMillis = options.resetThresholdInMillis || 60000;
            this.db = Database.getInstance();

            // Ensure database is initialized before proceeding
            this.dbInitialized = this.initialize();
        }

        private async initialize() {
            await this.db.waitForInitialization();
            await this.resetKeyIfExists();
        }

        private async resetKeyIfExists(): Promise<void> {
            const value = await this.db.get(this.key);
            if (value !== null) {
                await this.db.del(this.key);
            }
        }

        private async getQueueState(): Promise<{ queue: string[], lastProcessed: number }> {
            await this.dbInitialized;
            const value = await this.db.get(this.key);
            if (value === null) {
                return { queue: [], lastProcessed: Date.now() };
            }

            const [queueStr, lastProcessedStr] = value.split('|');
            const queue = queueStr.split(':').filter(Boolean);
            const lastProcessed = Number(lastProcessedStr);
            if (isNaN(lastProcessed)) {
                throw new Error('Invalid data format');
            }

            return { queue, lastProcessed };
        }

        private async updateQueueState(queue: string[], lastProcessed: number): Promise<void> {
            const data = `${queue.join(':')}|${lastProcessed}`;
            await this.db.put(this.key, data);
        }

        private async resetIfNeeded() {
            const now = Date.now();
            const { queue, lastProcessed } = await this.getQueueState();
            const elapsed = now - lastProcessed;

            if (elapsed > this.resetThresholdInMillis) {
                console.log(`elapsed time ${elapsed}ms exceeds threshold. resetting queue.`);
                await this.updateQueueState([], now);
                console.log(`queue reset due to elapsed time. New last processed time: ${now}`);
            }
        }

        private async evaluate(clientId: string, updateState: boolean): Promise<boolean> {
            await this.resetIfNeeded();
            const { queue, lastProcessed } = await this.getQueueState();
            const now = Date.now();
            const remainingTime = Math.max(0, this.resetThresholdInMillis - (now - lastProcessed));

            if (!updateState) {
                console.log(`Client ${clientId} check - Queue size: ${queue.length}, Time until reset: ${remainingTime}ms`);
            }

            if (queue.length < this.maxRequests) {
                if (updateState) {
                    queue.push(clientId);
                    await this.updateQueueState(queue, Date.now());
                    console.log(`Client ${clientId} added to the queue. Queue size: ${queue.length}`);
                }
                return true;
            } else {
                console.log(`Client ${clientId} request discarded. Queue is full.`);
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
