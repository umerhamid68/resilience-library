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
exports.CircuitBreakerSingleton = exports.CircuitBreakerState = exports.CircuitBreaker = void 0;
const rocksdb_1 = __importDefault(require("rocksdb"));
const events_1 = require("events");
const fs_1 = require("fs");
const path_1 = require("path");
const async_mutex_1 = require("async-mutex");
var CircuitBreakerState;
(function (CircuitBreakerState) {
    CircuitBreakerState["CLOSED"] = "CLOSED";
    CircuitBreakerState["OPEN"] = "OPEN";
    CircuitBreakerState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitBreakerState || (exports.CircuitBreakerState = CircuitBreakerState = {}));
class CircuitBreakerSingleton {
    static getInstance(options, loggingAdapter, telemetryAdapter) {
        const { resourceName } = options;
        if (!this.instances[resourceName]) {
            this.instances[resourceName] = new CircuitBreaker(options, loggingAdapter, telemetryAdapter);
        }
        return this.instances[resourceName];
    }
}
exports.CircuitBreakerSingleton = CircuitBreakerSingleton;
CircuitBreakerSingleton.instances = {};
class CircuitBreaker extends events_1.EventEmitter {
    constructor(options, loggingAdapter, telemetryAdapter) {
        super();
        this.state = CircuitBreakerState.CLOSED;
        this.isInitialized = false;
        this.options = options;
        this.loggingAdapter = loggingAdapter;
        this.telemetryAdapter = telemetryAdapter;
        this.validateOptions();
        this.calculateThresholds();
        this.initDb().catch(err => console.log('Initialization error: ' + err));
    }
    validateOptions() {
        const { errorThresholdPercentage, requestVolumeThreshold, failureThreshold, timeoutThreshold, successThreshold } = this.options;
        const hasThresholdPercentageAndVolume = errorThresholdPercentage !== undefined && requestVolumeThreshold !== undefined;
        const hasExplicitThresholds = failureThreshold !== undefined && timeoutThreshold !== undefined && successThreshold !== undefined;
        if (!hasThresholdPercentageAndVolume && !hasExplicitThresholds) {
            throw new Error('You must provide either errorThresholdPercentage and requestVolumeThreshold or explicit failureThreshold, timeoutThreshold, and successThreshold.');
        }
        if (hasThresholdPercentageAndVolume && hasExplicitThresholds) {
            throw new Error('You cannot provide both errorThresholdPercentage and requestVolumeThreshold and explicit failureThreshold, timeoutThreshold, and successThreshold.');
        }
    }
    calculateThresholds() {
        const { errorThresholdPercentage, requestVolumeThreshold, failureThreshold, timeoutThreshold, successThreshold } = this.options;
        if (errorThresholdPercentage !== undefined && requestVolumeThreshold !== undefined) {
            this.failureThreshold = Math.floor(requestVolumeThreshold * 0.2);
            this.timeoutThreshold = Math.floor(requestVolumeThreshold * 0.8);
            this.successThreshold = Math.floor(requestVolumeThreshold * (errorThresholdPercentage / 100));
        }
        else {
            this.failureThreshold = failureThreshold;
            this.timeoutThreshold = timeoutThreshold;
            this.successThreshold = successThreshold;
        }
    }
    static initDbInstance(loggingAdapter) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!CircuitBreaker.isDbInitialized) {
                try {
                    const dbPath = (0, path_1.join)(__dirname, 'db');
                    console.log(`Database path: ${dbPath}`);
                    if (!(0, fs_1.existsSync)(dbPath)) {
                        console.log(`Directory does not exist. Creating: ${dbPath}`);
                        (0, fs_1.mkdirSync)(dbPath, { recursive: true });
                    }
                    CircuitBreaker.db = new rocksdb_1.default(dbPath);
                    yield new Promise((resolve, reject) => {
                        CircuitBreaker.db.open({ create_if_missing: true }, (err) => {
                            if (err) {
                                reject('Failed to open the database: ' + err);
                            }
                            else {
                                console.log('Database opened successfully.');
                                resolve();
                            }
                        });
                    });
                    CircuitBreaker.isDbInitialized = true;
                }
                catch (err) {
                    console.log('Error initializing RocksDB: ' + err);
                }
            }
        });
    }
    initDb() {
        return __awaiter(this, void 0, void 0, function* () {
            yield CircuitBreaker.initDbInstance(this.loggingAdapter);
            yield this.loadStateFromDB();
            setInterval(() => this.resetCounters(), this.options.rollingWindowSize);
        });
    }
    loadStateFromDB() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stateAndStats = yield this.getStateAndStatsFromDB();
                if (stateAndStats) {
                    this.state = stateAndStats.state;
                }
                this.isInitialized = true;
            }
            catch (error) {
                console.log('Error loading state and stats from RocksDB: ' + error);
            }
        });
    }
    waitForInitialization() {
        return __awaiter(this, void 0, void 0, function* () {
            while (!this.isInitialized) {
                yield new Promise(resolve => setTimeout(resolve, 100));
            }
        });
    }
    getStateAndStatsFromDB() {
        return __awaiter(this, void 0, void 0, function* () {
            return CircuitBreaker.dbMutex.runExclusive(() => {
                return new Promise((resolve, reject) => {
                    CircuitBreaker.db.get(this.options.resourceName, (err, value) => {
                        if (err) {
                            if (err.message.includes('NotFound')) {
                                console.log('State and stats key not found in DB, initializing with default values.');
                                resolve(null);
                            }
                            else {
                                reject(err);
                            }
                        }
                        else {
                            resolve(value ? JSON.parse(value.toString()) : null);
                        }
                    });
                });
            });
        });
    }
    saveStateAndStatsToDB(stateAndStats) {
        return __awaiter(this, void 0, void 0, function* () {
            yield CircuitBreaker.dbMutex.runExclusive(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    yield this.putToDB(this.options.resourceName, JSON.stringify(stateAndStats));
                }
                catch (error) {
                    console.log('Error saving state and stats to RocksDB: ' + error);
                }
            }));
        });
    }
    putToDB(key, value) {
        return new Promise((resolve, reject) => {
            CircuitBreaker.db.put(key, value, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    incrementFailureCounter() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.incrementCounter('failure');
        });
    }
    incrementTimeoutCounter() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.incrementCounter('timeout');
        });
    }
    incrementSuccessCounter() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.incrementCounter('success');
        });
    }
    incrementCounter(type) {
        return __awaiter(this, void 0, void 0, function* () {
            const stateAndStats = yield this.getStateAndStatsFromDB();
            if (stateAndStats) {
                stateAndStats.stats[`${type}Count`]++;
                stateAndStats.stats.requestCount++;
                yield this.saveStateAndStatsToDB(stateAndStats);
                this.telemetryAdapter.collect({ event: type, resourceName: this.options.resourceName });
            }
        });
    }
    resetCounters() {
        return __awaiter(this, void 0, void 0, function* () {
            const stateAndStats = yield this.getStateAndStatsFromDB();
            if (stateAndStats) {
                const currentTime = Date.now();
                const windowStartTime = currentTime - this.options.rollingWindowSize;
                stateAndStats.stats.failureCount = 0;
                stateAndStats.stats.timeoutCount = 0;
                stateAndStats.stats.successCount = 0;
                yield this.saveStateAndStatsToDB(stateAndStats);
                this.telemetryAdapter.collect({ event: 'resetCounters', resourceName: this.options.resourceName });
            }
        });
    }
    moveToOpenState() {
        return __awaiter(this, void 0, void 0, function* () {
            this.state = CircuitBreakerState.OPEN;
            const stateAndStats = yield this.getStateAndStatsFromDB();
            if (stateAndStats) {
                stateAndStats.state = this.state;
                yield this.saveStateAndStatsToDB(stateAndStats);
                this.emit('stateChange', this.state);
                console.log('Circuit breaker moved to OPEN state.');
                this.telemetryAdapter.collect({ event: 'stateChange', state: this.state, resourceName: this.options.resourceName });
            }
            if (this.options.pingService) {
                this.startPingingService();
            }
            else {
                setTimeout(() => {
                    this.moveToHalfOpenState();
                }, this.options.sleepWindow);
            }
        });
    }
    moveToHalfOpenState() {
        return __awaiter(this, void 0, void 0, function* () {
            this.state = CircuitBreakerState.HALF_OPEN;
            const stateAndStats = yield this.getStateAndStatsFromDB();
            if (stateAndStats) {
                stateAndStats.state = this.state;
                stateAndStats.stats.successCount = 0;
                yield this.saveStateAndStatsToDB(stateAndStats);
                this.emit('stateChange', this.state);
                console.log('Circuit breaker moved to HALF_OPEN state after sleep window.');
                this.telemetryAdapter.collect({ event: 'stateChange', state: this.state, resourceName: this.options.resourceName });
            }
            if (this.options.pingService) {
                this.stopPingingService();
            }
        });
    }
    moveToClosedState() {
        return __awaiter(this, void 0, void 0, function* () {
            this.state = CircuitBreakerState.CLOSED;
            const stateAndStats = yield this.getStateAndStatsFromDB();
            if (stateAndStats) {
                stateAndStats.state = this.state;
                yield this.saveStateAndStatsToDB(stateAndStats);
                this.emit('stateChange', this.state);
                console.log('Circuit breaker moved to CLOSED state.');
                this.telemetryAdapter.collect({ event: 'stateChange', state: this.state, resourceName: this.options.resourceName });
            }
        });
    }
    handleCommandFailure(error) {
        return __awaiter(this, void 0, void 0, function* () {
            const isTimeout = error.status === 408 || error.code === 'ResourceExhausted';
            if (isTimeout) {
                console.log(`Timeout error:${error.message}`);
                yield this.incrementTimeoutCounter();
            }
            else {
                console.log(`Failure error:${error.message}`);
                yield this.incrementFailureCounter();
            }
            const stateAndStats = yield this.getStateAndStatsFromDB();
            if (stateAndStats && (this.state === CircuitBreakerState.HALF_OPEN || stateAndStats.stats.failureCount >= this.failureThreshold || stateAndStats.stats.timeoutCount >= this.timeoutThreshold)) {
                yield this.moveToOpenState();
            }
        });
    }
    invokeFallback(fallback, error) {
        return fallback ? fallback() : this.options.fallbackMethod ? this.options.fallbackMethod() : Promise.reject(error || 'Circuit breaker is open (Fail Fast).');
    }
    pingServiceLogic() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.options.pingService) {
                const isServiceAvailable = yield this.options.pingService();
                if (isServiceAvailable && this.state === CircuitBreakerState.OPEN) {
                    yield this.moveToHalfOpenState();
                    clearInterval(this.pingInterval);
                }
            }
        });
    }
    startPingingService() {
        if (this.pingInterval)
            clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => this.pingServiceLogic(), this.options.sleepWindow);
    }
    stopPingingService() {
        if (this.pingInterval)
            clearInterval(this.pingInterval);
    }
    execute(command, fallback) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.waitForInitialization();
            if (this.state === CircuitBreakerState.OPEN) {
                this.telemetryAdapter.collect({ event: 'blocked', resourceName: this.options.resourceName });
                return this.invokeFallback(fallback, Error('Circuit breaker is in OPEN state. Request blocked.'));
            }
            const stateAndStats = yield this.getStateAndStatsFromDB();
            if (stateAndStats) {
                stateAndStats.stats.requestCount++;
                yield this.saveStateAndStatsToDB(stateAndStats);
                try {
                    const result = yield command();
                    yield this.incrementSuccessCounter();
                    if (this.state === CircuitBreakerState.HALF_OPEN && stateAndStats.stats.successCount >= this.successThreshold) {
                        yield this.moveToClosedState();
                    }
                    return result;
                }
                catch (error) {
                    yield this.handleCommandFailure(error);
                    return this.invokeFallback(fallback, error);
                }
            }
        });
    }
    setFailureThreshold(threshold) {
        return __awaiter(this, void 0, void 0, function* () {
            this.failureThreshold = threshold;
        });
    }
    setTimeoutThreshold(threshold) {
        return __awaiter(this, void 0, void 0, function* () {
            this.timeoutThreshold = threshold;
        });
    }
    setSuccessThreshold(threshold) {
        return __awaiter(this, void 0, void 0, function* () {
            this.successThreshold = threshold;
        });
    }
    setSleepWindow(sleepWindow) {
        return __awaiter(this, void 0, void 0, function* () {
            this.options.sleepWindow = sleepWindow;
        });
    }
    setFallbackMethod(fallbackMethod) {
        return __awaiter(this, void 0, void 0, function* () {
            this.options.fallbackMethod = fallbackMethod;
        });
    }
    setManualState(state) {
        return __awaiter(this, void 0, void 0, function* () {
            this.state = state;
            const stateAndStats = yield this.getStateAndStatsFromDB();
            if (stateAndStats) {
                stateAndStats.state = this.state;
                yield this.saveStateAndStatsToDB(stateAndStats);
            }
        });
    }
    currentStatsFromDB() {
        return __awaiter(this, void 0, void 0, function* () {
            const stateAndStats = yield this.getStateAndStatsFromDB();
            return stateAndStats ? stateAndStats.stats : {
                requestCount: 0,
                failureCount: 0,
                successCount: 0,
                timeoutCount: 0,
            };
        });
    }
    currentStateFromDB() {
        return __awaiter(this, void 0, void 0, function* () {
            const stateAndStats = yield this.getStateAndStatsFromDB();
            return stateAndStats ? stateAndStats.state : this.state;
        });
    }
}
exports.CircuitBreaker = CircuitBreaker;
CircuitBreaker.isDbInitialized = false;
CircuitBreaker.dbMutex = new async_mutex_1.Mutex(); // Mutex for synchronizing database access
