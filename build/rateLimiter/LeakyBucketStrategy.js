"use strict";
//////////////////////////////////////////////////////with reqs per second as processing rate
/*import { RateLimitingStrategy } from './RateLimitingStrategy';
import rocksdb from 'rocksdb';
import { Mutex } from 'async-mutex';
import { LoggingAdapter } from '../adapters/LoggingAdapter';
import { TelemetryAdapter } from '../adapters/TelemetryAdapter';

export module LeakyBucketStrategy {
    export class LeakyBucketStrategy implements RateLimitingStrategy {
        private maxRequests: number;
        private ratePerSecond: number;
        private db: rocksdb;
        private key: string;
        private dbReady: Promise<void>;
        private mutex: Mutex;

        constructor(maxRequests: number, ratePerSecond: number, dbPath: string, key: string, loggingAdapter: LoggingAdapter, telemetryAdapter: TelemetryAdapter) {
            this.maxRequests = maxRequests;
            this.ratePerSecond = ratePerSecond;
            this.key = key;
            this.db = rocksdb(dbPath);
            this.mutex = new Mutex();
            this.dbReady = new Promise((resolve, reject) => {
                this.db.open({ create_if_missing: true }, (err) => {
                    if (err) {
                        console.error('failed to open database:', err);
                        reject(err);
                    } else {
                        console.log('Database opened.');
                        resolve();
                    }
                });
            });
        }

        private async processRequests() {
            await this.dbReady;
            const now = Date.now();
            const { currentBucketSize, lastRequestTime } = await this.getBucketState();
            const elapsedTime = now - lastRequestTime;
            const leakedTokens = Math.floor(elapsedTime * this.ratePerSecond / 1000);

            const newBucketSize = Math.max(0, currentBucketSize - leakedTokens);
            await this.updateBucketState(newBucketSize, now);
            console.log(`processed requests: Leaked ${leakedTokens} tokens, new bucket size: ${newBucketSize}`);
        }

        private async getBucketState(): Promise<{ currentBucketSize: number, lastRequestTime: number }> {
            return this.mutex.runExclusive(async () => {
                return new Promise<{ currentBucketSize: number, lastRequestTime: number }>((resolve, reject) => {
                    this.db.get(this.key, (err, value) => {
                        if (err) {
                            if (err.message.includes('NotFound')) {
                                console.log(`key not found in DB. initializing new bucket state.`);
                                resolve({ currentBucketSize: 0, lastRequestTime: Date.now() });
                            } else {
                                reject(err);
                            }
                        } else {
                            try {
                                const [currentBucketSizeStr, lastRequestTimeStr] = value.toString().split(':');
                                const currentBucketSize = Number(currentBucketSizeStr);
                                const lastRequestTime = Number(lastRequestTimeStr);
                                if (isNaN(currentBucketSize) || isNaN(lastRequestTime)) {
                                    throw new Error('Invalid data format');
                                }
                                console.log(`gotten state from DB:: Key: ${this.key}, currentBucketSize: ${currentBucketSize}, lastRequestTime: ${lastRequestTime}`);
                                resolve({ currentBucketSize, lastRequestTime });
                            } catch (error) {
                                console.error(`error parsing data: ${value.toString()}`);
                                reject(new Error('invalid data format'));
                            }
                        }
                    });
                });
            });
        }

        private async updateBucketState(currentBucketSize: number, lastRequestTime: number): Promise<void> {
            return this.mutex.runExclusive(async () => {
                return new Promise<void>((resolve, reject) => {
                    const data = `${currentBucketSize}:${lastRequestTime}`;
                    this.db.put(this.key, data, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            console.log(`updated state in DB - Key: ${this.key}, Data: ${data}`);
                            resolve();
                        }
                    });
                });
            });
        }

        async hit(clientId: string): Promise<boolean> {
            if (!clientId) {
                throw new Error('clientId cannot be null or undefined');
            }

            await this.processRequests();
            const { currentBucketSize } = await this.getBucketState();

            if (currentBucketSize < this.maxRequests) {
                await this.updateBucketState(currentBucketSize + 1, Date.now());
                console.log(`client ${clientId} added to the bucket. Current bucket size: ${currentBucketSize + 1}`);
                return true;
            } else {
                console.log(`client ${clientId} request discarded. Bucket is full.`);
                return false;
            }
        }

        async check(clientId: string): Promise<boolean> {
            if (!clientId) {
                throw new Error('clientId cannot be null or undefined');
            }

            await this.processRequests();
            const { currentBucketSize } = await this.getBucketState();
            console.log(`checking if client ${clientId} can be added to the bucket. Current bucket size: ${currentBucketSize}`);
            return currentBucketSize < this.maxRequests;
        }
    }
}*/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeakyBucketStrategy = void 0;
const rocksdb_1 = __importDefault(require("rocksdb"));
const async_mutex_1 = require("async-mutex");
var LeakyBucketStrategy;
(function (LeakyBucketStrategy_1) {
    class LeakyBucketStrategy {
        constructor(maxRequests, dbPath, key, resetThresholdInMillis = 3600000, loggingAdapter, telemetryAdapter) {
            this.maxRequests = maxRequests;
            this.key = key;
            this.resetThresholdInMillis = resetThresholdInMillis;
            this.db = (0, rocksdb_1.default)(dbPath);
            this.mutex = new async_mutex_1.Mutex();
            this.dbReady = new Promise((resolve, reject) => {
                this.db.open({ create_if_missing: true }, (err) => {
                    if (err) {
                        console.error('Failed to open the database:', err);
                        reject(err);
                    }
                    else {
                        console.log('Database opened successfully.');
                        resolve();
                    }
                });
            });
        }
        getQueueState() {
            return __awaiter(this, void 0, void 0, function* () {
                yield this.dbReady;
                return this.mutex.runExclusive(() => __awaiter(this, void 0, void 0, function* () {
                    return new Promise((resolve, reject) => {
                        this.db.get(this.key, (err, value) => {
                            if (err) {
                                if (err.message.includes('NotFound')) {
                                    console.log(`Key not found in DB. Making new queue state.`);
                                    resolve({ queue: [], lastProcessed: Date.now() });
                                }
                                else {
                                    reject(err);
                                }
                            }
                            else {
                                try {
                                    const [queueStr, lastProcessedStr] = value.toString().split('|');
                                    const queue = queueStr.split(':').filter(Boolean);
                                    const lastProcessed = Number(lastProcessedStr);
                                    if (isNaN(lastProcessed)) {
                                        throw new Error('Invalid data format');
                                    }
                                    console.log(`Retrieved state from DB - Key: ${this.key}, Queue: ${queue}, Last Processed: ${lastProcessed}`);
                                    resolve({ queue, lastProcessed });
                                }
                                catch (error) {
                                    console.error(`Error parsing data: ${value.toString()}`);
                                    reject(new Error('Invalid data format'));
                                }
                            }
                        });
                    });
                }));
            });
        }
        updateQueueState(queue, lastProcessed) {
            return __awaiter(this, void 0, void 0, function* () {
                yield this.dbReady;
                return this.mutex.runExclusive(() => __awaiter(this, void 0, void 0, function* () {
                    return new Promise((resolve, reject) => {
                        const data = `${queue.join(':')}|${lastProcessed}`;
                        this.db.put(this.key, data, (err) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                console.log(`Updated state in DB - Key: ${this.key}, Data: ${data}`);
                                resolve();
                            }
                        });
                    });
                }));
            });
        }
        resetIfNeeded() {
            return __awaiter(this, void 0, void 0, function* () {
                const now = Date.now();
                const { queue, lastProcessed } = yield this.getQueueState();
                const elapsed = now - lastProcessed;
                if (elapsed > this.resetThresholdInMillis) {
                    console.log(`elapsed time ${elapsed}ms exceeds threshold. resetting queue.`);
                    yield this.updateQueueState([], now);
                    console.log(`queue reset due to elapsed time. New lastprocessed time: ${now}`);
                }
            });
        }
        hit(clientId) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!clientId) {
                    throw new Error('clientId cannot be null or undefined');
                }
                yield this.resetIfNeeded();
                const { queue } = yield this.getQueueState();
                if (queue.length < this.maxRequests) {
                    queue.push(clientId);
                    yield this.updateQueueState(queue, Date.now());
                    console.log(`client ${clientId} added to the queue. Queue size: ${queue.length}`);
                    return true;
                }
                else {
                    console.log(`client ${clientId} request discarded. Queue is full.`);
                    return false;
                }
            });
        }
        check(clientId) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!clientId) {
                    throw new Error('clientId cannot be null or undefined');
                }
                yield this.resetIfNeeded();
                const { queue } = yield this.getQueueState();
                console.log(`checking if client ${clientId} can be added to the queue. Queue size: ${queue.length}`);
                return queue.length < this.maxRequests;
            });
        }
    }
    LeakyBucketStrategy_1.LeakyBucketStrategy = LeakyBucketStrategy;
})(LeakyBucketStrategy || (exports.LeakyBucketStrategy = LeakyBucketStrategy = {}));
