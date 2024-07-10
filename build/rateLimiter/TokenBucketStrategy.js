"use strict";
////////////////////////////////////////////////////////semaphore
/*import { RateLimitingStrategy } from './RateLimitingStrategy';
import rocksdb from 'rocksdb';
import { Semaphore } from '../semaphore/Semaphore';
import { LoggingAdapter } from '../adapters/LoggingAdapter';
import { TelemetryAdapter } from '../adapters/TelemetryAdapter';

export module TokenBucketStrategy {
    export class TokenBucketStrategy implements RateLimitingStrategy {
        private maxTokens: number;
        private refillRate: number; //per second
        private db: rocksdb;
        private key: string;
        private resetThresholdInMillis: number;
        private dbReady: Promise<void>;
        private semaphore: Semaphore;

        constructor(maxTokens: number, refillRate: number, dbPath: string, key: string, resetThresholdInMillis: number = 3600000, loggingAdapter: LoggingAdapter, telemetryAdapter: TelemetryAdapter) {
            this.maxTokens = maxTokens;
            this.refillRate = refillRate;
            this.key = key;
            this.resetThresholdInMillis = resetThresholdInMillis;
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
            this.semaphore = new Semaphore(1, './internal_semaphore', `${key}_semaphore`, new LoggingAdapter(), new TelemetryAdapter());
        }

        private async refill() {
            await this.dbReady;
            //await this.semaphore.acquire();
            try {
                const now = Date.now();
                const { tokens, lastRefill } = await this.getBucketState();
                const elapsed = (now - lastRefill) / 1000;

                if (now - lastRefill > this.resetThresholdInMillis) {
                    console.log(`Elapsed time ${elapsed}s exceeds threshold. Resetting last refill time.`);
                    await this.updateBucketState(this.maxTokens, now);
                    console.log(`Refilled 0 tokens (reset due to elapsed time), new token count: ${this.maxTokens}`);
                } else {
                    const refillAmount = Math.max(0, Math.floor(elapsed * this.refillRate));
                    const newTokens = Math.min(this.maxTokens, tokens + refillAmount);
                    await this.updateBucketState(newTokens, now);
                    console.log(`Refilled ${refillAmount} tokens (elapsed: ${elapsed}s), new token count: ${newTokens}`);
                }
            } finally {
                //await this.semaphore.release();
            }
        }

        private async getBucketState(): Promise<{ tokens: number, lastRefill: number }> {
            await this.dbReady;
            await this.semaphore.acquire();
            try {
                return new Promise<{ tokens: number, lastRefill: number }>((resolve, reject) => {
                    this.db.get(this.key, (err, value) => {
                        if (err) {
                            if (err.message.includes('NotFound')) {
                                console.log(`Key not found in DB, initializing new bucket state.`);
                                resolve({ tokens: this.maxTokens, lastRefill: Date.now() });
                            } else {
                                reject(err);
                            }
                        } else {
                            try {
                                const [tokensStr, lastRefillStr] = value.toString().split(':');
                                const tokens = Number(tokensStr);
                                const lastRefill = Number(lastRefillStr);
                                if (isNaN(tokens) || isNaN(lastRefill)) {
                                    throw new Error('Invalid data format');
                                }
                                console.log(`Retrieved state from DB - Key: ${this.key}, Tokens: ${tokens}, Last Refill: ${lastRefill}`);
                                resolve({ tokens, lastRefill });
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

        private async updateBucketState(tokens: number, lastRefill: number): Promise<void> {
            await this.dbReady;
            await this.semaphore.acquire();
            try {
                return new Promise<void>((resolve, reject) => {
                    const data = `${tokens}:${lastRefill}`;
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
            if (!clientId) {
                throw new Error('clientId cannot be null or undefined');
            }

            await this.refill();
            const { tokens } = await this.getBucketState();
            console.log(`Client ${clientId} is trying to hit. Current tokens: ${tokens}`);
            if (tokens > 0) {
                await this.updateBucketState(tokens - 1, Date.now());
                console.log(`Client ${clientId} hit successful. Tokens left: ${tokens - 1}`);
                return true;
            }
            console.log(`Client ${clientId} hit failed. No tokens left.`);
            return false;
        }

        async check(clientId: string): Promise<boolean> {
            if (!clientId) {
                throw new Error('clientId cannot be null or undefined');
            }
            await this.refill();
            const { tokens } = await this.getBucketState();
            console.log(`Checking if client ${clientId} can hit. Current tokens: ${tokens}`);
            return tokens > 0;
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
exports.TokenBucketStrategy = void 0;
const rocksdb_1 = __importDefault(require("rocksdb"));
const async_mutex_1 = require("async-mutex");
var TokenBucketStrategy;
(function (TokenBucketStrategy_1) {
    class TokenBucketStrategy {
        constructor(maxTokens, refillRate, dbPath, key, resetThresholdInMillis = 3600000, loggingAdapter, telemetryAdapter) {
            this.maxTokens = maxTokens;
            this.refillRate = refillRate;
            this.key = key;
            this.resetThresholdInMillis = resetThresholdInMillis;
            this.db = (0, rocksdb_1.default)(dbPath);
            this.mutex = new async_mutex_1.Mutex();
            this.dbReady = new Promise((resolve, reject) => {
                this.db.open({ create_if_missing: true }, (err) => {
                    if (err) {
                        console.error('failed to opendatabase:', err);
                        reject(err);
                    }
                    else {
                        console.log('database open.');
                        resolve();
                    }
                });
            });
        }
        refill() {
            return __awaiter(this, void 0, void 0, function* () {
                yield this.dbReady;
                //console.log('here 3');
                const now = Date.now();
                const { tokens, lastRefill } = yield this.getBucketState();
                const elapsed = (now - lastRefill) / 1000;
                if (now - lastRefill > this.resetThresholdInMillis) {
                    console.log(`time ${elapsed}s exceeds threshold. resetting`); //reset last refill time
                    yield this.updateBucketState(this.maxTokens, now);
                    console.log(`refilled 0 tokens (reset), new token count: ${this.maxTokens}`);
                }
                else {
                    const refillAmount = Math.max(0, Math.floor(elapsed * this.refillRate));
                    const newTokens = Math.min(this.maxTokens, tokens + refillAmount);
                    yield this.updateBucketState(newTokens, now);
                    console.log(`refilled ${refillAmount} tokens (${elapsed}s), new token count: ${newTokens}`);
                }
            });
        }
        getBucketState() {
            return __awaiter(this, void 0, void 0, function* () {
                //await this.dbReady;
                return this.mutex.runExclusive(() => __awaiter(this, void 0, void 0, function* () {
                    return new Promise((resolve, reject) => {
                        this.db.get(this.key, (err, value) => {
                            if (err) {
                                if (err.message.includes('NotFound')) {
                                    console.log(`key notin DB. making new bucket state.`);
                                    resolve({ tokens: this.maxTokens, lastRefill: Date.now() });
                                }
                                else {
                                    reject(err);
                                }
                            }
                            else {
                                try {
                                    const [tokensStr, lastRefillStr] = value.toString().split(':');
                                    const tokens = Number(tokensStr);
                                    const lastRefill = Number(lastRefillStr);
                                    if (isNaN(tokens) || isNaN(lastRefill)) {
                                        throw new Error('invalid data format');
                                    }
                                    console.log(`-- gotten state from DB:: key: ${this.key}, tokens: ${tokens}, last Refill: ${lastRefill}`);
                                    resolve({ tokens, lastRefill });
                                }
                                catch (error) {
                                    console.error(`error parsing data: ${value.toString()}`);
                                    reject(new Error('invalid data format'));
                                }
                            }
                        });
                    });
                }));
            });
        }
        updateBucketState(tokens, lastRefill) {
            return __awaiter(this, void 0, void 0, function* () {
                //await this.dbReady;
                return this.mutex.runExclusive(() => __awaiter(this, void 0, void 0, function* () {
                    return new Promise((resolve, reject) => {
                        const data = `${tokens}:${lastRefill}`;
                        this.db.put(this.key, data, (err) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                console.log(`-- updated state in DB:: key: ${this.key}, data: ${data}`);
                                resolve();
                            }
                        });
                    });
                }));
            });
        }
        hit(clientId) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!clientId) {
                    throw new Error('clientId cannot be null');
                }
                yield this.refill();
                const { tokens } = yield this.getBucketState();
                console.log(`client ${clientId} is trying to hit. Current tokens: ${tokens}`);
                if (tokens > 0) {
                    yield this.updateBucketState(tokens - 1, Date.now());
                    console.log(`client ${clientId} hit successful. Tokens left: ${tokens - 1}`);
                    return true;
                }
                console.log(`client ${clientId} hit failed. No tokens left.`);
                return false;
            });
        }
        check(clientId) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!clientId) {
                    throw new Error('clientId cannot be null');
                }
                yield this.refill();
                const { tokens } = yield this.getBucketState();
                console.log(`check if client ${clientId} can hit. current tokens: ${tokens}`);
                return tokens > 0;
            });
        }
    }
    TokenBucketStrategy_1.TokenBucketStrategy = TokenBucketStrategy;
})(TokenBucketStrategy || (exports.TokenBucketStrategy = TokenBucketStrategy = {}));
