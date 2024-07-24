/////////////////////
import { EventEmitter } from 'events';
import { Database } from '../Database';
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
            isFailure: true,
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

interface Bucket {
    timestamp: number;
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
    private db: Database;
    private isInitialized = false;
    private options: CircuitBreakerOptions;
    private pingInterval?: NodeJS.Timeout;
    private failureThreshold!: number;
    private timeoutThreshold!: number;
    private successThreshold!: number;
    private slowCallDurationThreshold: number;
    private epochSize: number = 1; // 1 second epochs

    public beforeExecute?: (context: IPolicyContext) => Promise<void>;
    public afterExecute?: (context: IPolicyContext) => Promise<void>;

    constructor(options: CircuitBreakerOptions) {
        super();
        this.options = options;
        this.slowCallDurationThreshold = options.slowCallDurationThreshold || 60000; // ms
        this.db = Database.getInstance();

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

    private async initDb() {
        await this.db.waitForInitialization();
        await this.resetKeyIfExists();
        await this.loadStateFromDB();
        setInterval(() => this.rollBuckets(), this.epochSize * 1000);
    }

    private async resetKeyIfExists(): Promise<void> {
        const value = await this.db.get(this.options.resourceName);
        if (value !== null) {
            await this.db.del(this.options.resourceName);
        }
        const bucketKeys = await this.db.keys(`${this.options.resourceName}:`);
        for (const key of bucketKeys) {
            await this.db.del(key);
        }
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
        const value = await this.db.get(this.options.resourceName);
        return value ? JSON.parse(value) : null;
    }

    private async saveStateAndStatsToDB(stateAndStats: CircuitBreakerStateAndStats) {
        try {
            await this.db.put(this.options.resourceName, JSON.stringify(stateAndStats));
            console.log(`State and stats saved to DB for ${this.options.resourceName}: ${JSON.stringify(stateAndStats)}`);
        } catch (error) {
            console.log('Error saving state and stats to RocksDB: ' + error);
        }
    }

    private async rollBuckets() {
        console.log('----------------roll');
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const lastBucketTimestamp = await this.getLastBucketTimestamp();

        if (currentTimestamp > lastBucketTimestamp) {
            const newBucket: Bucket = {
                timestamp: currentTimestamp,
                stats: { requestCount: 0, failureCount: 0, successCount: 0, timeoutCount: 0 }
            };

            await this.saveBucket(newBucket);
            const allBuckets = await this.getAllBuckets();

            if (allBuckets.length > Math.ceil(this.options.rollingWindowSize / this.epochSize)) {
                const oldBucket = allBuckets.shift();
                if (oldBucket) {
                    await this.deleteBucket(oldBucket);
                }
            }
        }
    }

    private async saveBucket(bucket: Bucket) {
        const key = `${this.options.resourceName}:${bucket.timestamp}`;
        console.log(`Saving bucket: ${key} with stats: ${JSON.stringify(bucket.stats)}`);
        await this.db.put(key, JSON.stringify(bucket));
    }

    private async deleteBucket(bucket: Bucket) {
        const key = `${this.options.resourceName}:${bucket.timestamp}`;
        console.log(`deleting bucket ${key}`);
        await this.db.del(key);
    }

    private async incrementCounter(type: 'failure' | 'timeout' | 'success') {
        const currentTimestamp = Math.floor(Date.now() / 1000);
        let bucket = await this.getBucket(currentTimestamp);

        // Aggregate stats
        bucket.stats[`${type}Count`]++;
        bucket.stats.requestCount++;

        await this.saveBucket(bucket);
        console.log({ event: type, resourceName: this.options.resourceName });
    }

    async calculateAggregates(): Promise<CircuitStats> {
        let aggregatedStats: CircuitStats = { requestCount: 0, failureCount: 0, successCount: 0, timeoutCount: 0 };
        const allBuckets = await this.getAllBuckets();

        for (const bucket of allBuckets) {
            aggregatedStats.requestCount += bucket.stats.requestCount;
            aggregatedStats.failureCount += bucket.stats.failureCount;
            aggregatedStats.successCount += bucket.stats.successCount;
            aggregatedStats.timeoutCount += bucket.stats.timeoutCount;
        }
        console.log(`Aggregated Stats: ${JSON.stringify(aggregatedStats)}`);
        return aggregatedStats;
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
            await this.incrementCounter('timeout');
        } else if (unifiedError.isFailure) {
            await this.incrementCounter('failure');
        }

        console.error(unifiedError.message);
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
                        await this.incrementCounter('success');
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
                    const start = Date.now();
                    try {
                        const result = await fn({ signal });
                        const duration = Date.now() - start;
                        if (duration > this.slowCallDurationThreshold) {
                            await this.incrementCounter('timeout');
                            throw new Error('Request timed out');
                        } else {
                            await this.incrementCounter('success');
                        }
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

    private async shouldOpenCircuit() {
        const { failureCount, timeoutCount, requestCount } = await this.calculateAggregates();
        return (
            failureCount >= this.failureThreshold ||
            timeoutCount >= this.timeoutThreshold
        );
    }

    private async shouldMoveToCloseState(): Promise<boolean> {
        const { successCount } = await this.calculateAggregates();
        return successCount >= this.successThreshold;
    }

    private async resetSuccessCounter() {
        const stateAndStats = await this.getStateAndStatsFromDB();
        if (stateAndStats) {
            stateAndStats.stats.successCount = 0;
            await this.saveStateAndStatsToDB(stateAndStats);
        }
    }

    private async getLastBucketTimestamp(): Promise<number> {
        const keys = await this.db.keys(`${this.options.resourceName}:`);
        const timestamps = keys.map(key => parseInt(key.split(':')[1])).sort((a, b) => b - a);
        return timestamps.length > 0 ? timestamps[0] : Math.floor(Date.now() / 1000);
    }

    private async getAllBuckets(): Promise<Bucket[]> {
        const keys = await this.db.keys(`${this.options.resourceName}:`);
        const buckets: Bucket[] = [];
        for (const key of keys) {
            const value = await this.db.get(key);
            if (value) {
                buckets.push(JSON.parse(value));
            }
        }
        return buckets;
    }

    private async getBucket(timestamp: number): Promise<Bucket> {
        const key = `${this.options.resourceName}:${timestamp}`;
        const value = await this.db.get(key);
        if (value) {
            return JSON.parse(value);
        }
        return {
            timestamp,
            stats: { requestCount: 0, failureCount: 0, successCount: 0, timeoutCount: 0 }
        };
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
}

export { CircuitBreaker, CircuitBreakerFactory, CircuitBreakerState, CircuitBreakerOptions };
