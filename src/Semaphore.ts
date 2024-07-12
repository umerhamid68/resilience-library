// /////////////////////////////////////////new semaphore implementation
// import rocksdb from 'rocksdb';
// import { LoggingAdapter } from '../adapters/LoggingAdapter';
// import { TelemetryAdapter } from '../adapters/TelemetryAdapter';

// export class Semaphore {
//     private maxConcurrent: number;
//     private loggingAdapter: LoggingAdapter;
//     private telemetryAdapter: TelemetryAdapter;
//     private db: rocksdb;
//     private key: string;
//     private dbReady: Promise<void>;

//     constructor(maxConcurrent: number, dbPath: string, key: string, loggingAdapter: LoggingAdapter, telemetryAdapter: TelemetryAdapter) {
//         this.maxConcurrent = maxConcurrent;
//         this.loggingAdapter = loggingAdapter;
//         this.telemetryAdapter = telemetryAdapter;
//         this.key = key;
//         this.db = rocksdb(dbPath);
//         this.dbReady = new Promise((resolve, reject) => {
//             this.db.open({ create_if_missing: true }, (err) => {
//                 if (err) {
//                     console.error('failed to open database:', err);
//                     reject(err);
//                 } else {
//                     console.log('database opened.');
//                     resolve();
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
//         await this.dbReady;
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
//         await this.dbReady;
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
//         this.loggingAdapter.log(`resource acquired. Current count: ${currentCount + 1}`);
//         console.log(`resource acquired. Current count: ${currentCount + 1}`);
//         this.telemetryAdapter.collect({ event: 'resource_acquired', count: currentCount + 1 });
//         return true;
//     }

//     async release(): Promise<void> {
//         await this.dbReady;
//         const currentCount = await this.getResourceCount();
//         if (currentCount > 0) {
//             await this.updateResourceCount(currentCount - 1);
//             this.loggingAdapter.log(`resource released. Current count: ${currentCount - 1}`);
//             console.log(`resource released. Current count: ${currentCount - 1}`);
//             //this.telemetryAdapter.collect({ event: 'resource_released', count: currentCount - 1 });
//         } else {
//             console.log(`no resources to release.`);
//         }
//     }
// }


//////////////////////////////////////////with create method
/*import rocksdb from 'rocksdb';
import { DefaultLoggingAdapter, LoggingAdapter } from '../adapters/LoggingAdapter';
import { DefaultTelemetryAdapter, TelemetryAdapter } from '../adapters/TelemetryAdapter';

export class Semaphore {
    private maxConcurrent: number;
    private loggingAdapter: LoggingAdapter;
    private telemetryAdapter: TelemetryAdapter;
    private db: rocksdb;
    private key: string;
    private dbReady: Promise<void>;

    constructor(maxConcurrent: number, dbPath: string, key: string, loggingAdapter: LoggingAdapter, telemetryAdapter: TelemetryAdapter) {
        this.maxConcurrent = maxConcurrent;
        this.loggingAdapter = loggingAdapter;
        this.telemetryAdapter = telemetryAdapter;
        this.key = key;
        this.db = rocksdb(dbPath);
        this.dbReady = new Promise((resolve, reject) => {
            this.db.open({ create_if_missing: true }, async (err) => {
                if (err) {
                    console.error('failed to open database:', err);
                    reject(err);
                } else {
                    console.log('database opened.');
                    await this.resetKeyIfExists();
                    resolve();
                }
            });
        });
    }
    static create(maxConcurrent: number, dbPath: string, key: string, loggingAdapter: LoggingAdapter, telemetryAdapter?: TelemetryAdapter): Semaphore {
        const semaphore = new Semaphore(maxConcurrent, dbPath, key, loggingAdapter || new DefaultLoggingAdapter(), telemetryAdapter || new DefaultTelemetryAdapter());
        //await semaphore.dbReady;
        return semaphore;
    }
    private async resetKeyIfExists(): Promise<void> {
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
        
    }

    async close(): Promise<void> {
        await this.dbReady;
        return new Promise<void>((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    console.error('failed to close database:', err);
                    reject(err);
                } else {
                    console.log('database closed.');
                    resolve();
                }
            });
        });
    }

    private async getResourceCount(): Promise<number> {
        //await this.dbReady;
        return new Promise<number>((resolve, reject) => {
            this.db.get(this.key, (err, value) => {
                if (err) {
                    if (err.message.includes('NotFound')) {
                        console.log(`key not found in DB. starting new resource count.`);
                        resolve(0);
                    } else {
                        reject(err);
                    }
                } else {
                    try {
                        const count = Number(value.toString());
                        if (isNaN(count)) {
                            throw new Error('invalid data format');
                        }
                        console.log(`--gotten resource count from DB:: Key: ${this.key}, Count: ${count}`);
                        resolve(count);
                    } catch (error) {
                        console.error(`error parsing data: ${value.toString()}`);
                        reject(new Error('invalid data format'));
                    }
                }
            });
        });
    }

    private async updateResourceCount(count: number): Promise<void> {
        //await this.dbReady;
        return new Promise<void>((resolve, reject) => {
            this.db.put(this.key, count.toString(), (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`--updated resource count in DB:: Key: ${this.key}, Count: ${count}`);
                    resolve();
                }
            });
        });
    }

    async acquire(): Promise<boolean> {
        await this.dbReady;
        const currentCount = await this.getResourceCount();
        if (currentCount >= this.maxConcurrent) {
            console.log(`resource limit reached. cannot get more.`);
            return false;
        }

        await this.updateResourceCount(currentCount + 1);
        this.loggingAdapter.log(`resource acquired. Current count: ${currentCount + 1}`);
        console.log(`resource acquired. Current count: ${currentCount + 1}`);
        this.telemetryAdapter.collect({ event: 'resource_acquired', count: currentCount + 1 });
        return true;
    }

    async release(): Promise<void> {
        await this.dbReady;
        const currentCount = await this.getResourceCount();
        if (currentCount > 0) {
            await this.updateResourceCount(currentCount - 1);
            this.loggingAdapter.log(`resource released. Current count: ${currentCount - 1}`);
            console.log(`resource released. Current count: ${currentCount - 1}`);
            this.telemetryAdapter.collect({ event: 'resource_released', count: currentCount - 1 });
        } else {
            console.log(`no resources to release.`);
        }
    }
}
*/



/////////////////////////////////////////////////with policy integration

import rocksdb from 'rocksdb';
import { DefaultLoggingAdapter, LoggingAdapter } from './adapters/LoggingAdapter';
import { DefaultTelemetryAdapter, TelemetryAdapter } from './adapters/TelemetryAdapter';
import { IPolicy, IPolicyContext } from './Policy';

export class Semaphore implements IPolicy {
    private maxConcurrent: number;
    private loggingAdapter: LoggingAdapter;
    private telemetryAdapter: TelemetryAdapter;
    private db: rocksdb;
    private key: string;
    private dbReady: Promise<void>;

    constructor(maxConcurrent: number, dbPath: string, key: string, loggingAdapter: LoggingAdapter, telemetryAdapter: TelemetryAdapter) {
        this.maxConcurrent = maxConcurrent;
        this.loggingAdapter = loggingAdapter;
        this.telemetryAdapter = telemetryAdapter;
        this.key = key;
        this.db = rocksdb(dbPath);
        this.dbReady = new Promise((resolve, reject) => {
            this.db.open({ create_if_missing: true }, async (err) => {
                if (err) {
                    console.error('failed to open database:', err);
                    reject(err);
                } else {
                    console.log('database opened.');
                    await this.resetKeyIfExists();
                    resolve();
                }
            });
        });
    }

    static create(maxConcurrent: number, dbPath: string, key: string, loggingAdapter: LoggingAdapter, telemetryAdapter?: TelemetryAdapter): Semaphore {
        const semaphore = new Semaphore(maxConcurrent, dbPath, key, loggingAdapter || new DefaultLoggingAdapter(), telemetryAdapter || new DefaultTelemetryAdapter());
        return semaphore;
    }

    private async resetKeyIfExists(): Promise<void> {
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
    }

    async close(): Promise<void> {
        await this.dbReady;
        return new Promise<void>((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    console.error('failed to close database:', err);
                    reject(err);
                } else {
                    console.log('database closed.');
                    resolve();
                }
            });
        });
    }

    private async getResourceCount(): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            this.db.get(this.key, (err, value) => {
                if (err) {
                    if (err.message.includes('NotFound')) {
                        console.log(`key not found in DB. starting new resource count.`);
                        resolve(0);
                    } else {
                        reject(err);
                    }
                } else {
                    try {
                        const count = Number(value.toString());
                        if (isNaN(count)) {
                            throw new Error('invalid data format');
                        }
                        console.log(`--gotten resource count from DB:: Key: ${this.key}, Count: ${count}`);
                        resolve(count);
                    } catch (error) {
                        console.error(`error parsing data: ${value.toString()}`);
                        reject(new Error('invalid data format'));
                    }
                }
            });
        });
    }

    private async updateResourceCount(count: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.db.put(this.key, count.toString(), (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`--updated resource count in DB:: Key: ${this.key}, Count: ${count}`);
                    resolve();
                }
            });
        });
    }

    async acquire(): Promise<boolean> {
        await this.dbReady;
        const currentCount = await this.getResourceCount();
        if (currentCount >= this.maxConcurrent) {
            console.log(`resource limit reached. cannot get more.`);
            return false;
        }

        await this.updateResourceCount(currentCount + 1);
        this.loggingAdapter.log(`resource acquired. Current count: ${currentCount + 1}`);
        console.log(`resource acquired. Current count: ${currentCount + 1}`);
        this.telemetryAdapter.collect({ event: 'resource_acquired', count: currentCount + 1 });
        return true;
    }

    async release(): Promise<void> {
        await this.dbReady;
        const currentCount = await this.getResourceCount();
        if (currentCount > 0) {
            await this.updateResourceCount(currentCount - 1);
            this.loggingAdapter.log(`resource released. Current count: ${currentCount - 1}`);
            console.log(`resource released. Current count: ${currentCount - 1}`);
            this.telemetryAdapter.collect({ event: 'resource_released', count: currentCount - 1 });
        } else {
            console.log(`no resources to release.`);
        }
    }

    async execute<T>(fn: (context: IPolicyContext) => PromiseLike<T> | T, signal: AbortSignal = new AbortController().signal): Promise<T> {
        const isAcquired = await this.acquire();
        if (isAcquired) {
            try {
                const result = await fn({ signal });
                return result;
            } finally {
                await this.release();
            }
        } else {
            throw new Error('Resource limit reached');
        }
    }
}



//////////////////////////////////////////////improved policy integration
/*import rocksdb from 'rocksdb';
import { DefaultLoggingAdapter, LoggingAdapter } from './adapters/LoggingAdapter';
import { DefaultTelemetryAdapter, TelemetryAdapter } from './adapters/TelemetryAdapter';


interface IPolicyContext {
    signal: AbortSignal;
}

export class Semaphore {
    private maxConcurrent: number;
    private loggingAdapter: LoggingAdapter;
    private telemetryAdapter: TelemetryAdapter;
    private db: rocksdb;
    private key: string;
    private dbReady: Promise<void>;

    constructor(maxConcurrent: number, dbPath: string, key: string, loggingAdapter: LoggingAdapter, telemetryAdapter: TelemetryAdapter) {
        this.maxConcurrent = maxConcurrent;
        this.loggingAdapter = loggingAdapter;
        this.telemetryAdapter = telemetryAdapter;
        this.key = key;
        this.db = rocksdb(dbPath);
        this.dbReady = new Promise((resolve, reject) => {
            this.db.open({ create_if_missing: true }, async (err) => {
                if (err) {
                    console.error('failed to open database:', err);
                    reject(err);
                } else {
                    console.log('database opened.');
                    await this.resetKeyIfExists();
                    resolve();
                }
            });
        });
    }

    static create(maxConcurrent: number, dbPath: string, key: string, loggingAdapter: LoggingAdapter, telemetryAdapter?: TelemetryAdapter): Semaphore {
        const semaphore = new Semaphore(maxConcurrent, dbPath, key, loggingAdapter || new DefaultLoggingAdapter(), telemetryAdapter || new DefaultTelemetryAdapter());
        return semaphore;
    }

    private async resetKeyIfExists(): Promise<void> {
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
    }

    async close(): Promise<void> {
        await this.dbReady;
        return new Promise<void>((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    console.error('failed to close database:', err);
                    reject(err);
                } else {
                    console.log('database closed.');
                    resolve();
                }
            });
        });
    }

    private async getResourceCount(): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            this.db.get(this.key, (err, value) => {
                if (err) {
                    if (err.message.includes('NotFound')) {
                        console.log(`key not found in DB. starting new resource count.`);
                        resolve(0);
                    } else {
                        reject(err);
                    }
                } else {
                    try {
                        const count = Number(value.toString());
                        if (isNaN(count)) {
                            throw new Error('invalid data format');
                        }
                        console.log(`--gotten resource count from DB:: Key: ${this.key}, Count: ${count}`);
                        resolve(count);
                    } catch (error) {
                        console.error(`error parsing data: ${value.toString()}`);
                        reject(new Error('invalid data format'));
                    }
                }
            });
        });
    }

    private async updateResourceCount(count: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.db.put(this.key, count.toString(), (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`--updated resource count in DB:: Key: ${this.key}, Count: ${count}`);
                    resolve();
                }
            });
        });
    }

    async acquire(context: IPolicyContext): Promise<boolean> {
        await this.dbReady;
        const { signal } = context;
        
        if (signal.aborted) {
            throw new Error('Semaphore acquisition aborted');
        }

        signal.addEventListener('abort', () => {
            this.loggingAdapter.log('Semaphore acquisition aborted');
        });

        const currentCount = await this.getResourceCount();
        if (currentCount >= this.maxConcurrent) {
            this.loggingAdapter.log(`resource limit reached. cannot get more.`);
            return false;
        }

        await this.updateResourceCount(currentCount + 1);
        this.loggingAdapter.log(`resource acquired. Current count: ${currentCount + 1}`);
        //console.log(`resource acquired. Current count: ${currentCount + 1}`);
        this.telemetryAdapter.collect({ event: 'resource_acquired', count: currentCount + 1 });
        return true;
    }

    async release(): Promise<void> {
        await this.dbReady;
        const currentCount = await this.getResourceCount();
        if (currentCount > 0) {
            await this.updateResourceCount(currentCount - 1);
            this.loggingAdapter.log(`resource released. Current count: ${currentCount - 1}`);
            //console.log(`resource released. Current count: ${currentCount - 1}`);
            this.telemetryAdapter.collect({ event: 'resource_released', count: currentCount - 1 });
        } else {
            this.loggingAdapter.log(`no resources to release.`);
        }
    }
}*/



