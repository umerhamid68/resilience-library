/////////////////////////////////////////new semaphore implementation
import rocksdb from 'rocksdb';
import { LoggingAdapter } from '../adapters/LoggingAdapter';
import { TelemetryAdapter } from '../adapters/TelemetryAdapter';

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
        await this.dbReady;
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
        await this.dbReady;
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
            //this.telemetryAdapter.collect({ event: 'resource_released', count: currentCount - 1 });
        } else {
            console.log(`no resources to release.`);
        }
    }
}




