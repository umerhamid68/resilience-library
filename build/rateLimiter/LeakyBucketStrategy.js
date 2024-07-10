"use strict";
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
            this.loggingAdapter = loggingAdapter;
            this.telemetryAdapter = telemetryAdapter;
            this.dbReady = new Promise((resolve, reject) => {
                this.db.open({ create_if_missing: true }, (err) => {
                    if (err) {
                        this.loggingAdapter.log(`failed to opendatabase: ${err}`);
                        console.error('failed to open database:', err);
                        reject(err);
                    }
                    else {
                        this.loggingAdapter.log('database opened.');
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
                                    this.loggingAdapter.log(`Key not found in DB. Making new queue state.`);
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
                                        throw new Error('invalid data format');
                                    }
                                    this.loggingAdapter.log(`--gotten state from DB - Key: ${this.key}, Queue: ${queue}, Last Processed: ${lastProcessed}`);
                                    resolve({ queue, lastProcessed });
                                }
                                catch (error) {
                                    this.loggingAdapter.log(`error parsing data: ${value.toString()}`);
                                    console.error(`error parsing data: ${value.toString()}`);
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
                                this.loggingAdapter.log(`--updated state in DB - Key: ${this.key}, Data: ${data}`);
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
                    this.loggingAdapter.log(`elapsed time ${elapsed}ms exceeds threshold. resetting queue.`);
                    yield this.updateQueueState([], now);
                    this.loggingAdapter.log(`queue reset due to elapsed time. New lastprocessed time: ${now}`);
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
                    this.loggingAdapter.log(`client ${clientId} added to the queue. Queue size: ${queue.length}`);
                    return true;
                }
                else {
                    this.loggingAdapter.log(`client ${clientId} request discarded. Queue is full.`);
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
                this.loggingAdapter.log(`checking if client ${clientId} can be added to the queue. Queue size: ${queue.length}`);
                return queue.length < this.maxRequests;
            });
        }
    }
    LeakyBucketStrategy_1.LeakyBucketStrategy = LeakyBucketStrategy;
})(LeakyBucketStrategy || (exports.LeakyBucketStrategy = LeakyBucketStrategy = {}));
