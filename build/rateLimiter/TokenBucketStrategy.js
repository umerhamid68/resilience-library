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
            this.loggingAdapter = loggingAdapter;
            this.telemetryAdapter = telemetryAdapter;
            this.dbReady = new Promise((resolve, reject) => {
                this.db.open({ create_if_missing: true }, (err) => {
                    if (err) {
                        this.loggingAdapter.log(`failed to opendatabase: ${err}`);
                        //console.error('failed to opendatabase:', err);
                        reject(err);
                    }
                    else {
                        this.loggingAdapter.log('database open.');
                        //this.loggingAdapter.log('database open.');
                        resolve();
                    }
                });
            });
        }
        refill() {
            return __awaiter(this, void 0, void 0, function* () {
                yield this.dbReady;
                //this.loggingAdapter.log('here 3');
                const now = Date.now();
                const { tokens, lastRefill } = yield this.getBucketState();
                const elapsed = (now - lastRefill) / 1000;
                if (now - lastRefill > this.resetThresholdInMillis) {
                    this.loggingAdapter.log(`time ${elapsed}s exceeds threshold. resetting`);
                    //this.loggingAdapter.log(`time ${elapsed}s exceeds threshold. resetting`); //reset last refill time
                    yield this.updateBucketState(this.maxTokens, now);
                    this.loggingAdapter.log(`refilled 0 tokens (reset), new token count: ${this.maxTokens}`);
                    //this.loggingAdapter.log(`refilled 0 tokens (reset), new token count: ${this.maxTokens}`);
                }
                else {
                    const refillAmount = Math.max(0, Math.floor(elapsed * this.refillRate));
                    const newTokens = Math.min(this.maxTokens, tokens + refillAmount);
                    yield this.updateBucketState(newTokens, now);
                    this.loggingAdapter.log(`refilled ${refillAmount} tokens (${elapsed}s), new token count: ${newTokens}`);
                    //this.loggingAdapter.log(`refilled ${refillAmount} tokens (${elapsed}s), new token count: ${newTokens}`);
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
                                    this.loggingAdapter.log(`key notin DB. making new bucket state.`);
                                    //this.loggingAdapter.log(`key notin DB. making new bucket state.`);
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
                                    this.loggingAdapter.log(`-- gotten state from DB:: key: ${this.key}, tokens: ${tokens}, last Refill: ${lastRefill}`);
                                    //this.loggingAdapter.log(`-- gotten state from DB:: key: ${this.key}, tokens: ${tokens}, last Refill: ${lastRefill}`);
                                    resolve({ tokens, lastRefill });
                                }
                                catch (error) {
                                    this.loggingAdapter.log(`error parsing data: ${value.toString()}`);
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
                                this.loggingAdapter.log(`-- updated state in DB:: key: ${this.key}, data: ${data}`);
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
                this.loggingAdapter.log(`client ${clientId} is trying to hit. Current tokens: ${tokens}`);
                if (tokens > 0) {
                    yield this.updateBucketState(tokens - 1, Date.now());
                    this.loggingAdapter.log(`client ${clientId} hit successful. Tokens left: ${tokens - 1}`);
                    return true;
                }
                this.loggingAdapter.log(`client ${clientId} hit failed. No tokens left.`);
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
                this.loggingAdapter.log(`check if client ${clientId} can hit. current tokens: ${tokens}`);
                return tokens > 0;
            });
        }
    }
    TokenBucketStrategy_1.TokenBucketStrategy = TokenBucketStrategy;
})(TokenBucketStrategy || (exports.TokenBucketStrategy = TokenBucketStrategy = {}));
