// ////////////////////////////////////updated logging and telemtery
// import rocksdb from 'rocksdb';
// import { DefaultLoggingAdapter, LoggingAdapter } from './adapters/LoggingAdapter';
// import { DefaultTelemetryAdapter, TelemetryAdapter } from './adapters/TelemetryAdapter';
// import { IPolicy, IPolicyContext } from './Policy';
// import { join } from 'path';
// import { existsSync, mkdirSync } from 'fs';

// export class Semaphore implements IPolicy {
//     private maxConcurrent: number;
//     /*private loggingAdapter: LoggingAdapter;
//     private telemetryAdapter: TelemetryAdapter;*/
//     private db: rocksdb;
//     private key: string;
//     private dbReady: Promise<void>;

//     //hooks
//     public beforeExecute?: (context: IPolicyContext) => Promise<void>;
//     public afterExecute?: (context: IPolicyContext) => Promise<void>;

//     constructor(maxConcurrent: number, key: string) {
//         this.maxConcurrent = maxConcurrent;
//         /*this.loggingAdapter = loggingAdapter;
//         this.telemetryAdapter = telemetryAdapter;*/
//         this.key = key;
//         const dbPath = join(__dirname, 'db', 'semaphore');
//         if (!existsSync(dbPath)) {
//             mkdirSync(dbPath, { recursive: true });
//         }
//         this.db = rocksdb(dbPath);
//         this.dbReady = new Promise((resolve, reject) => {
//             this.db.open({ create_if_missing: true }, async (err) => {
//                 if (err) {
//                     console.error('failed to open database:', err);
//                     reject(err);
//                 } else {
//                     console.log('database opened.');
//                     await this.resetKeyIfExists();
//                     resolve();
//                 }
//             });
//         });
//     }

//     static create(key: string, maxConcurrent: number): Semaphore {
//         const semaphore = new Semaphore(maxConcurrent, key);
//         return semaphore;
//     }

//     private async resetKeyIfExists(): Promise<void> {
//         return new Promise<void>((resolve, reject) => {
//             this.db.get(this.key, (err, value) => {
//                 if (err && err.message.includes('NotFound')) {
//                     console.log(`key not in DB. making new bucket state.`);
//                     resolve();
//                 } else if (!err) {
//                     console.log(`Existing key detected. Deleting key: ${this.key}`);
//                     this.db.del(this.key, {}, (delErr) => {
//                         if (delErr) {
//                             reject(delErr);
//                         } else {
//                             console.log(`Key deleted: ${this.key}`);
//                             resolve();
//                         }
//                     });
//                 } else {
//                     reject(err);
//                 }
//             });
//         });
//     }

//     async close(): Promise<void> {
//         await this.dbReady;
//         return new Promise<void>((resolve, reject) => {
//             this.db.close((err) => {
//                 if (err) {
//                     console.error('failed to close database:', err);
//                     reject(err);
//                 } else {
//                     console.log('database closed.');
//                     resolve();
//                 }
//             });
//         });
//     }

//     private async getResourceCount(): Promise<number> {
//         return new Promise<number>((resolve, reject) => {
//             this.db.get(this.key, (err, value) => {
//                 if (err) {
//                     if (err.message.includes('NotFound')) {
//                         console.log(`key not found in DB. starting new resource count.`);
//                         resolve(0);
//                     } else {
//                         reject(err);
//                     }
//                 } else {
//                     try {
//                         const count = Number(value.toString());
//                         if (isNaN(count)) {
//                             throw new Error('invalid data format');
//                         }
//                         console.log(`--gotten resource count from DB:: Key: ${this.key}, Count: ${count}`);
//                         resolve(count);
//                     } catch (error) {
//                         console.error(`error parsing data: ${value.toString()}`);
//                         reject(new Error('invalid data format'));
//                     }
//                 }
//             });
//         });
//     }

//     private async updateResourceCount(count: number): Promise<void> {
//         return new Promise<void>((resolve, reject) => {
//             this.db.put(this.key, count.toString(), (err) => {
//                 if (err) {
//                     reject(err);
//                 } else {
//                     console.log(`--updated resource count in DB:: Key: ${this.key}, Count: ${count}`);
//                     resolve();
//                 }
//             });
//         });
//     }

//     async acquire(): Promise<boolean> {
//         await this.dbReady;
//         const currentCount = await this.getResourceCount();
//         if (currentCount >= this.maxConcurrent) {
//             console.log(`resource limit reached. cannot get more.`);
//             return false;
//         }

//         await this.updateResourceCount(currentCount + 1);
//         //this.loggingAdapter.log(`resource acquired. Current count: ${currentCount + 1}`);
//         console.log(`resource acquired. Current count: ${currentCount + 1}`);
//         //this.telemetryAdapter.collect({ event: 'resource_acquired', count: currentCount + 1 });
//         return true;
//     }

//     async release(): Promise<void> {
//         await this.dbReady;
//         const currentCount = await this.getResourceCount();
//         if (currentCount > 0) {
//             await this.updateResourceCount(currentCount - 1);
//             //this.loggingAdapter.log(`resource released. Current count: ${currentCount - 1}`);
//             console.log(`resource released. Current count: ${currentCount - 1}`);
//             //this.telemetryAdapter.collect({ event: 'resource_released', count: currentCount - 1 });
//         } else {
//             console.log(`no resources to release.`);
//         }
//     }

//     async execute<T>(fn: (context: IPolicyContext) => PromiseLike<T> | T, signal: AbortSignal = new AbortController().signal): Promise<T> {
//         const isAcquired = await this.acquire();
//         if (isAcquired) {
//             if (this.beforeExecute) await this.beforeExecute({ signal });
//             try {
//                 const result = await fn({ signal });
//                 return result;
//             } finally {
//                 if (this.afterExecute) await this.afterExecute({ signal });
//                 await this.release();
//             }
//         } else {
//             throw new Error('Resource limit reached');
//         }
//     }
// }



/////////////////////////////////database component
import { Database } from './Database';
import { IPolicy, IPolicyContext } from './Policy';

export class Semaphore implements IPolicy {
    private maxConcurrent: number;
    private db: Database;
    private key: string;
    private dbInitialized: Promise<void>;

    // Hooks
    public beforeExecute?: (context: IPolicyContext) => Promise<void>;
    public afterExecute?: (context: IPolicyContext) => Promise<void>;

    constructor(maxConcurrent: number, key: string) {
        this.maxConcurrent = maxConcurrent;
        this.key = key + '- semaphore';
        this.db = Database.getInstance();

        // Ensure database is initialized before proceeding
        this.dbInitialized = this.initialize();
    }

    static create(key: string, maxConcurrent: number): Semaphore {
        return new Semaphore(maxConcurrent, key);
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

    private async getResourceCount(): Promise<number> {
        await this.dbInitialized;
        const value = await this.db.get(this.key);
        if (value === null) {
            return 0;
        }

        const count = Number(value);
        if (isNaN(count)) {
            throw new Error('Invalid data format');
        }
        return count;
    }

    private async updateResourceCount(count: number): Promise<void> {
        await this.db.put(this.key, count.toString());
    }

    async acquire(): Promise<boolean> {
        const currentCount = await this.getResourceCount();
        if (currentCount >= this.maxConcurrent) {
            console.log(`Resource limit reached. Cannot get more.`);
            return false;
        }

        await this.updateResourceCount(currentCount + 1);
        console.log(`Resource acquired. Current count: ${currentCount + 1}`);
        return true;
    }

    async release(): Promise<void> {
        const currentCount = await this.getResourceCount();
        if (currentCount > 0) {
            await this.updateResourceCount(currentCount - 1);
            console.log(`Resource released. Current count: ${currentCount - 1}`);
        } else {
            console.log(`No resources to release.`);
        }
    }

    async execute<T>(fn: (context: IPolicyContext) => PromiseLike<T> | T, signal: AbortSignal = new AbortController().signal): Promise<T> {
        const isAcquired = await this.acquire();
        if (isAcquired) {
            if (this.beforeExecute) await this.beforeExecute({ signal });
            try {
                const result = await fn({ signal });
                return result;
            } finally {
                if (this.afterExecute) await this.afterExecute({ signal });
                await this.release();
            }
        } else {
            throw new Error('Resource limit reached');
        }
    }
}





