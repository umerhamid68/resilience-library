////////////////////////////////////////////////////////////new circuitbreaker
import RocksDB from 'rocksdb';
import { EventEmitter } from 'events';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { Mutex } from 'async-mutex';
import grpc from '@grpc/grpc-js';
import { IPolicy, IPolicyContext } from '../Policy';
import {
    BaseCircuitBreakerOptions,
    ErrorPercentageCircuitBreakerOptions,
    ExplicitThresholdCircuitBreakerOptions
} from './CircuitBreakerOptions';

interface UnifiedError {
    isTimeout: boolean;
    isFailure: boolean;
    message: string;
    originalError: any;
}

// Transform HTTP error
function transformHttpError(error: any): UnifiedError {
    return {
        isTimeout: error.status === 408,
        isFailure: error.status >= 500 && error.status < 600,
        message: error.message,
        originalError: error,
    };
}

// Transform gRPC error
function transformGrpcError(error: any): UnifiedError {
    return {
        isTimeout: error.code === grpc.status.DEADLINE_EXCEEDED,
        isFailure: error.code === grpc.status.UNAVAILABLE || error.code === grpc.status.INTERNAL,
        message: error.details,
        originalError: error,
    };
}

// Detect and transform error
function transformError(error: any): UnifiedError {
    if (error.status !== undefined) {
        return transformHttpError(error);
    } else if (error.code !== undefined && error.details !== undefined) {
        return transformGrpcError(error);
    } else {
        return {
            isTimeout: false,
            isFailure: false,
            message: 'Unknown error structure',
            originalError: error,
        };
    }
}

enum CircuitBreakerState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN',
}

interface CircuitStats {
    requestCount: number;
    failureCount: number;
    successCount: number;
    timeoutCount: number;
}

interface CircuitBreakerStateAndStats {
    state: CircuitBreakerState;
    stats: CircuitStats;
}

type CircuitBreakerOptions = ErrorPercentageCircuitBreakerOptions | ExplicitThresholdCircuitBreakerOptions;

class CircuitBreakerFactory {
    private static instances: { [resourceName: string]: CircuitBreaker } = {};

    public static create(options: ErrorPercentageCircuitBreakerOptions): CircuitBreaker;
    public static create(options: ExplicitThresholdCircuitBreakerOptions): CircuitBreaker;
    public static create(options: CircuitBreakerOptions): CircuitBreaker {
        if (!this.instances[options.resourceName]) {
            this.instances[options.resourceName] = new CircuitBreaker(options);
        }

        return this.instances[options.resourceName];
    }
}

class CircuitBreaker extends EventEmitter implements IPolicy {
    private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
    private static db: RocksDB;
    private static isDbInitialized = false;
    private isInitialized = false;
    private options: CircuitBreakerOptions;
    private pingInterval?: NodeJS.Timeout;
    private failureThreshold!: number;
    private timeoutThreshold!: number;
    private successThreshold!: number;
    private static dbMutex = new Mutex(); // Mutex for synchronizing database access

    public beforeExecute?: (context: IPolicyContext) => Promise<void>;
    public afterExecute?: (context: IPolicyContext) => Promise<void>;

    constructor(options: CircuitBreakerOptions) {
        super();
        this.options = options;

        this.validateOptions();
        this.calculateThresholds();

        this.initDb().catch(err => console.log('Initialization error: ' + err));
    }

    private validateOptions() {
        const { errorThresholdPercentage, requestVolumeThreshold, failureThreshold, timeoutThreshold, successThreshold } = this.options as ErrorPercentageCircuitBreakerOptions & ExplicitThresholdCircuitBreakerOptions;
        const hasThresholdPercentageAndVolume = errorThresholdPercentage !== undefined && requestVolumeThreshold !== undefined;
        const hasExplicitThresholds = failureThreshold !== undefined && timeoutThreshold !== undefined && successThreshold !== undefined;

        if (!hasThresholdPercentageAndVolume && !hasExplicitThresholds) {
            throw new Error('You must provide either errorThresholdPercentage and requestVolumeThreshold or explicit failureThreshold, timeoutThreshold, and successThreshold.');
        }

        if (hasThresholdPercentageAndVolume && hasExplicitThresholds) {
            throw new Error('You cannot provide both errorThresholdPercentage and requestVolumeThreshold and explicit failureThreshold, timeoutThreshold, and successThreshold.');
        }
    }

    private calculateThresholds() {
        const { errorThresholdPercentage, requestVolumeThreshold, failureThreshold, timeoutThreshold, successThreshold } = this.options as ErrorPercentageCircuitBreakerOptions & ExplicitThresholdCircuitBreakerOptions;
        if (errorThresholdPercentage !== undefined && requestVolumeThreshold !== undefined) {
            this.failureThreshold = Math.floor(requestVolumeThreshold * (errorThresholdPercentage / 100));
            this.timeoutThreshold = Math.floor(requestVolumeThreshold * 0.8);
            this.successThreshold = Math.floor(requestVolumeThreshold * (100 - errorThresholdPercentage) / 100);
        } else {
            this.failureThreshold = failureThreshold!;
            this.timeoutThreshold = timeoutThreshold!;
            this.successThreshold = successThreshold!;
        }
    }

    private static async initDbInstance() {
        if (!CircuitBreaker.isDbInitialized) {
            try {
                const dbPath = join(__dirname, 'db');
                console.log(`Database path: ${dbPath}`);

                if (!existsSync(dbPath)) {
                    console.log(`Directory does not exist. Creating: ${dbPath}`);
                    mkdirSync(dbPath, { recursive: true });
                }

                CircuitBreaker.db = new RocksDB(dbPath);
                await new Promise<void>((resolve, reject) => {
                    CircuitBreaker.db.open({ create_if_missing: true }, (err) => {
                        if (err) {
                            reject('Failed to open the database: ' + err);
                        } else {
                            console.log('Database opened successfully.');
                            resolve();
                        }
                    });
                });

                CircuitBreaker.isDbInitialized = true;
            } catch (err) {
                console.log('Error initializing RocksDB: ' + err);
            }
        }
    }

    private async initDb() {
        await CircuitBreaker.initDbInstance();
        await this.loadStateFromDB();
        setInterval(() => this.resetCounters(), this.options.rollingWindowSize);
    }

    private async loadStateFromDB() {
        try {
            const stateAndStats = await this.getStateAndStatsFromDB();
            if (stateAndStats) {
                this.state = stateAndStats.state;
            } else {
                await this.saveStateAndStatsToDB({
                    state: this.state,
                    stats: {
                        requestCount: 0,
                        failureCount: 0,
                        successCount: 0,
                        timeoutCount: 0,
                    },
                });
            }
            this.isInitialized = true;
        } catch (error) {
            console.log('Error loading state and stats from RocksDB: ' + error);
        }
    }

    private async waitForInitialization() {
        while (!this.isInitialized) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    private async getStateAndStatsFromDB(): Promise<CircuitBreakerStateAndStats | null> {
        return CircuitBreaker.dbMutex.runExclusive(() => {
            return new Promise((resolve, reject) => {
                CircuitBreaker.db.get(this.options.resourceName, (err, value) => {
                    if (err) {
                        if (err.message.includes('NotFound')) {
                            console.log('State and stats key not found in DB, initializing with default values.');
                            resolve(null);
                        } else {
                            reject(err);
                        }
                    } else {
                        resolve(value ? JSON.parse(value.toString()) : null);
                    }
                });
            });
        });
    }

    private async saveStateAndStatsToDB(stateAndStats: CircuitBreakerStateAndStats) {
        await CircuitBreaker.dbMutex.runExclusive(async () => {
            try {
                await this.putToDB(this.options.resourceName, JSON.stringify(stateAndStats));
                console.log(`State and stats saved to DB for ${this.options.resourceName}: ${JSON.stringify(stateAndStats)}`);
            } catch (error) {
                console.log('Error saving state and stats to RocksDB: ' + error);
            }
        });
    }

    private putToDB(key: string, value: string): Promise<void> {
        return new Promise((resolve, reject) => {
            CircuitBreaker.db.put(key, value, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    private async incrementFailureCounter() {
        await this.incrementCounter('failure');
    }

    private async incrementTimeoutCounter() {
        await this.incrementCounter('timeout');
    }

    private async incrementSuccessCounter() {
        await this.incrementCounter('success');
    }

    private async incrementCounter(type: 'failure' | 'timeout' | 'success') {
        const stateAndStats = await this.getStateAndStatsFromDB();
        if (stateAndStats) {
            stateAndStats.stats[`${type}Count`]++;
            stateAndStats.stats.requestCount++;
            await this.saveStateAndStatsToDB(stateAndStats);
            console.log({ event: type, resourceName: this.options.resourceName });
        }
    }

    private async resetCounters() {
        const stateAndStats = await this.getStateAndStatsFromDB();
        if (stateAndStats) {
            stateAndStats.stats.failureCount = 0;
            stateAndStats.stats.timeoutCount = 0;
            stateAndStats.stats.successCount = 0;
            await this.saveStateAndStatsToDB(stateAndStats);
            console.log({ event: 'resetCounters', resourceName: this.options.resourceName });
        }
    }

    private async moveToOpenState() {
        this.state = CircuitBreakerState.OPEN;
        const stateAndStats = await this.getStateAndStatsFromDB();
        if (stateAndStats) {
            stateAndStats.state = this.state;
            await this.saveStateAndStatsToDB(stateAndStats);
            this.emit('stateChange', this.state);
            console.log('Circuit breaker moved to OPEN state.');
            console.log({ event: 'stateChange', state: this.state, resourceName: this.options.resourceName });
        }
    }

    private startPingingService() {
        if (this.state !== CircuitBreakerState.OPEN || this.pingInterval) return;
        console.log('Ping service started');
        this.pingInterval = setInterval(async () => {
            if (this.options.pingService) {
                try {
                    const isServiceAvailable = await this.options.pingService();
                    if (isServiceAvailable) {
                        console.log('Ping successful, transitioning to HALF_OPEN');
                        this.state = CircuitBreakerState.HALF_OPEN;
                        const stateAndStats = await this.getStateAndStatsFromDB();
                        if (stateAndStats) {
                            stateAndStats.state = this.state;
                            await this.saveStateAndStatsToDB(stateAndStats);
                        }
                        this.emit('stateChange', this.state);
                        console.log('Circuit breaker moved to HALF_OPEN state.');
                        console.log({ event: 'stateChange', state: this.state, resourceName: this.options.resourceName });
                        this.stopPingingService();
                    }
                } catch (error) {
                    console.log('Ping service error: ' + error);
                }
            }
        }, this.options.sleepWindow);
    }

    private stopPingingService() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = undefined;
            console.log('Ping service stopped');
        }
    }

    private async moveToClosedState() {
        this.state = CircuitBreakerState.CLOSED;
        const stateAndStats = await this.getStateAndStatsFromDB();
        if (stateAndStats) {
            stateAndStats.state = this.state;
            await this.saveStateAndStatsToDB(stateAndStats);
            this.emit('stateChange', this.state);
            console.log('Circuit breaker moved to CLOSED state.');
            console.log({ event: 'stateChange', state: this.state, resourceName: this.options.resourceName });
        }
    }

    private async moveToHalfOpenState() {
        setTimeout(async () => {
            this.state = CircuitBreakerState.HALF_OPEN;
            const stateAndStats = await this.getStateAndStatsFromDB();
            if (stateAndStats) {
                stateAndStats.state = this.state;
                await this.saveStateAndStatsToDB(stateAndStats);
            }
            this.emit('stateChange', this.state);
            console.log('Circuit breaker moved to HALF_OPEN state.');
            console.log({ event: 'stateChange', state: this.state, resourceName: this.options.resourceName });
        }, this.options.sleepWindow);
    }

    private async handleCommandFailure(error: any) {
        const unifiedError = transformError(error);

        if (unifiedError.isTimeout) {
            await this.incrementTimeoutCounter();
        } else if (unifiedError.isFailure) {
            await this.incrementFailureCounter();
        }

        console.error(unifiedError.message);
    }

    private async shouldOpenCircuit() {
        const stateAndStats = await this.getStateAndStatsFromDB();
        if (stateAndStats) {
            const { failureCount, timeoutCount, requestCount } = stateAndStats.stats;
            return (
                failureCount >= this.failureThreshold ||
                timeoutCount >= this.timeoutThreshold
            );
        }
        return false;
    }

    private async shouldMoveToCloseState(): Promise<boolean> {
        const stateAndStats = await this.getStateAndStatsFromDB();
        if (!stateAndStats) return false;

        const { successCount } = stateAndStats.stats;

        return successCount >= this.successThreshold;
    }

    private async resetSuccessCounter() {
        const stateAndStats = await this.getStateAndStatsFromDB();
        if (stateAndStats) {
            stateAndStats.stats.successCount = 0;
            await this.saveStateAndStatsToDB(stateAndStats);
        }
    }

    public async setFailureThreshold(threshold: number) {
        this.failureThreshold = threshold;
    }

    public async setTimeoutThreshold(threshold: number) {
        this.timeoutThreshold = threshold;
    }

    public async setSuccessThreshold(threshold: number) {
        this.successThreshold = threshold;
    }

    public async setSleepWindow(sleepWindow: number) {
        this.options.sleepWindow = sleepWindow;
    }

    public async setFallbackMethod(fallbackMethod: () => any) {
        this.options.fallbackMethod = fallbackMethod;
    }

    public async setManualState(state: CircuitBreakerState) {
        this.state = state;
        const stateAndStats = await this.getStateAndStatsFromDB();
        if (stateAndStats) {
            stateAndStats.state = this.state;
            await this.saveStateAndStatsToDB(stateAndStats);
        }
    }

    public async currentStatsFromDB(): Promise<CircuitStats> {
        const stateAndStats = await this.getStateAndStatsFromDB();
        return stateAndStats ? stateAndStats.stats : {
            requestCount: 0,
            failureCount: 0,
            successCount: 0,
            timeoutCount: 0,
        };
    }

    public async currentStateFromDB(): Promise<CircuitBreakerState> {
        const stateAndStats = await this.getStateAndStatsFromDB();
        return stateAndStats ? stateAndStats.state : this.state;
    }

    public async execute<T>(fn: (context: IPolicyContext) => PromiseLike<T> | T, signal: AbortSignal = new AbortController().signal): Promise<T> {
        await this.waitForInitialization();
        
        if (this.beforeExecute) await this.beforeExecute({ signal });

        try {
            switch (this.state) {
                case CircuitBreakerState.OPEN:
                    console.log('State is OPEN');
                    if (this.options.pingService) {
                        console.log('Starting ping service');
                        this.startPingingService();
                        throw new Error('Circuit breaker is in OPEN state. Request blocked.');
                    } else if (this.options.fallbackMethod) {
                        console.log('Executing fallback after failure');
                        this.moveToHalfOpenState();
                        return Promise.resolve(this.options.fallbackMethod());
                    } else {
                        this.moveToHalfOpenState();
                        throw new Error('Circuit breaker is in OPEN state. Request blocked.');
                    }

                case CircuitBreakerState.HALF_OPEN:
                    console.log('State is HALF_OPEN');
                    await this.resetSuccessCounter();
                    try {
                        const result = await fn({ signal });
                        await this.incrementSuccessCounter();
                        if (await this.shouldMoveToCloseState()) {
                            await this.moveToClosedState();
                        }
                        return result;
                    } catch (error: any) {
                        await this.handleCommandFailure(error);
                        await this.moveToOpenState();
                        throw error;
                    }

                case CircuitBreakerState.CLOSED:
                default:
                    console.log('State is CLOSED');
                    try {
                        const result = await fn({ signal });
                        await this.incrementSuccessCounter();
                        return result;
                    } catch (error: any) {
                        await this.handleCommandFailure(error);
                        if (await this.shouldOpenCircuit()) {
                            await this.moveToOpenState();
                        }
                        throw error;
                    }
            }
        } finally {
            if (this.afterExecute) await this.afterExecute({ signal });
        }
    }
    
    public static create(strategyType: 'error_percentage', options: ErrorPercentageCircuitBreakerOptions): CircuitBreaker;
    public static create(strategyType: 'explicit_threshold', options: ExplicitThresholdCircuitBreakerOptions): CircuitBreaker;
    public static create(strategyType: string, options: CircuitBreakerOptions): CircuitBreaker {
        return new CircuitBreaker(options);
    }
}

export { CircuitBreaker, CircuitBreakerFactory, CircuitBreakerState, CircuitBreakerOptions };



