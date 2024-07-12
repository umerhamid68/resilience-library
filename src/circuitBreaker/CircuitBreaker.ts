// import RocksDB from 'rocksdb';
// import { EventEmitter } from 'events';
// import { mkdirSync, existsSync } from 'fs';
// import { join } from 'path';
// import { LoggingAdapter } from '../adapters/LoggingAdapter';
// import { TelemetryAdapter } from '../adapters/TelemetryAdapter';
// import { Mutex } from 'async-mutex';

// enum CircuitBreakerState {
//     CLOSED = 'CLOSED',
//     OPEN = 'OPEN',
//     HALF_OPEN = 'HALF_OPEN',
// }

// interface CircuitBreakerOptions {
//     resourceName: string;
//     rollingWindowSize: number;
//     requestVolumeThreshold?: number;
//     errorThresholdPercentage?: number;
//     sleepWindow: number;
//     failureThreshold?: number;
//     timeoutThreshold?: number;
//     successThreshold?: number;
//     fallbackMethod?: () => any;
//     pingService?: () => Promise<boolean>;
// }

// interface CircuitStats {
//     requestCount: number;
//     failureCount: number;
//     successCount: number;
//     timeoutCount: number;
// }

// interface CircuitBreakerStateAndStats {
//     state: CircuitBreakerState;
//     stats: CircuitStats;
// }

// class CircuitBreakerSingleton {
//     private static instances: { [resourceName: string]: CircuitBreaker } = {};

// public static getInstance(
//     options: CircuitBreakerOptions,
//     loggingAdapter: LoggingAdapter,
//     telemetryAdapter: TelemetryAdapter
// ): CircuitBreaker {
//     const { resourceName } = options;
    
//     if (!this.instances[resourceName]) {
//         this.instances[resourceName] = new CircuitBreaker(options, loggingAdapter, telemetryAdapter);
//     }
    
//     return this.instances[resourceName];
// }
// }

// class CircuitBreaker extends EventEmitter {
//     private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
//     private static db: RocksDB;
//     private static isDbInitialized = false;
//     private isInitialized = false;
//     private options: CircuitBreakerOptions;
//     private loggingAdapter: LoggingAdapter;
//     private telemetryAdapter: TelemetryAdapter;
//     private pingInterval?: NodeJS.Timeout;
//     private failureThreshold!: number;
//     private timeoutThreshold!: number;
//     private successThreshold!: number;
//     private static dbMutex = new Mutex(); // Mutex for synchronizing database access

// constructor(options: CircuitBreakerOptions, loggingAdapter: LoggingAdapter, telemetryAdapter: TelemetryAdapter) {
//     super();
//     this.options = options;
//     this.loggingAdapter = loggingAdapter;
//     this.telemetryAdapter = telemetryAdapter;

//     this.validateOptions();
//     this.calculateThresholds();

//     this.initDb().catch(err => console.log('Initialization error: ' + err));
// }

// private validateOptions() {
//     const { errorThresholdPercentage, requestVolumeThreshold, failureThreshold, timeoutThreshold, successThreshold } = this.options;
//     const hasThresholdPercentageAndVolume = errorThresholdPercentage !== undefined && requestVolumeThreshold !== undefined;
//     const hasExplicitThresholds = failureThreshold !== undefined && timeoutThreshold !== undefined && successThreshold !== undefined;

//     if (!hasThresholdPercentageAndVolume && !hasExplicitThresholds) {
//         throw new Error('You must provide either errorThresholdPercentage and requestVolumeThreshold or explicit failureThreshold, timeoutThreshold, and successThreshold.');
//     }

//     if (hasThresholdPercentageAndVolume && hasExplicitThresholds) {
//         throw new Error('You cannot provide both errorThresholdPercentage and requestVolumeThreshold and explicit failureThreshold, timeoutThreshold, and successThreshold.');
//     }
// }

// private calculateThresholds() {
//     const { errorThresholdPercentage, requestVolumeThreshold, failureThreshold, timeoutThreshold, successThreshold } = this.options;
//     if (errorThresholdPercentage !== undefined && requestVolumeThreshold !== undefined) {
//         this.failureThreshold = Math.floor(requestVolumeThreshold * 0.2);
//         this.timeoutThreshold = Math.floor(requestVolumeThreshold * 0.8);
//         this.successThreshold = Math.floor(requestVolumeThreshold * (errorThresholdPercentage / 100));
//     } else {
//         this.failureThreshold = failureThreshold!;
//         this.timeoutThreshold = timeoutThreshold!;
//         this.successThreshold = successThreshold!;
//     }
// }

// private static async initDbInstance(loggingAdapter: LoggingAdapter) {
//     if (!CircuitBreaker.isDbInitialized) {
//         try {
//             const dbPath = join(__dirname, 'db');
//             console.log(`Database path: ${dbPath}`);

//             if (!existsSync(dbPath)) {
//                 console.log(`Directory does not exist. Creating: ${dbPath}`);
//                 mkdirSync(dbPath, { recursive: true });
//             }

//             CircuitBreaker.db = new RocksDB(dbPath);
//             await new Promise<void>((resolve, reject) => {
//                 CircuitBreaker.db.open({ create_if_missing: true }, (err) => {
//                     if (err) {
//                         reject('Failed to open the database: ' + err);
//                     } else {
//                         console.log('Database opened successfully.');
//                         resolve();
//                     }
//                 });
//             });

//             CircuitBreaker.isDbInitialized = true;
//         } catch (err) {
//             console.log('Error initializing RocksDB: ' + err);
//         }
//     }
// }

// private async initDb() {
//     await CircuitBreaker.initDbInstance(this.loggingAdapter);
//     await this.loadStateFromDB();
//     setInterval(() => this.resetCounters(), this.options.rollingWindowSize);
// }

// private async loadStateFromDB() {
//     try {
//         const stateAndStats = await this.getStateAndStatsFromDB();
//         if (stateAndStats) {
//             this.state = stateAndStats.state;
//         } else {
//             // Initialize state and stats if not found in DB
//             await this.saveStateAndStatsToDB({
//                 state: this.state,
//                 stats: {
//                     requestCount: 0,
//                     failureCount: 0,
//                     successCount: 0,
//                     timeoutCount: 0,
//                 },
//             });
//         }
//         this.isInitialized = true;
//     } catch (error) {
//         console.log('Error loading state and stats from RocksDB: ' + error);
//     }
// }

// private async waitForInitialization() {
//     while (!this.isInitialized) {
//         await new Promise(resolve => setTimeout(resolve, 100));
//     }
// }

// private async getStateAndStatsFromDB(): Promise<CircuitBreakerStateAndStats | null> {
//     return CircuitBreaker.dbMutex.runExclusive(() => {
//         return new Promise((resolve, reject) => {
//             CircuitBreaker.db.get(this.options.resourceName, (err, value) => {
//                 if (err) {
//                     if (err.message.includes('NotFound')) {
//                         console.log('State and stats key not found in DB, initializing with default values.');
//                         resolve(null);
//                     } else {
//                         reject(err);
//                     }
//                 } else {
//                     resolve(value ? JSON.parse(value.toString()) : null);
//                 }
//             });
//         });
//     });
// }

// private async saveStateAndStatsToDB(stateAndStats: CircuitBreakerStateAndStats) {
//     await CircuitBreaker.dbMutex.runExclusive(async () => {
//         try {
//             await this.putToDB(this.options.resourceName, JSON.stringify(stateAndStats));
//             console.log(`State and stats saved to DB for ${this.options.resourceName}: ${JSON.stringify(stateAndStats)}`);
//         } catch (error) {
//             console.log('Error saving state and stats to RocksDB: ' + error);
//         }
//     });
// }

// private putToDB(key: string, value: string): Promise<void> {
//     return new Promise((resolve, reject) => {
//         CircuitBreaker.db.put(key, value, (err) => {
//             if (err) reject(err);
//             else resolve();
//         });
//     });
// }

// private async incrementFailureCounter() {
//     await this.incrementCounter('failure');
// }

// private async incrementTimeoutCounter() {
//     await this.incrementCounter('timeout');
// }

// private async incrementSuccessCounter() {
//     await this.incrementCounter('success');
// }

// private async incrementCounter(type: 'failure' | 'timeout' | 'success') {
//     const stateAndStats = await this.getStateAndStatsFromDB();
//     if (stateAndStats) {
//         stateAndStats.stats[`${type}Count`]++;
//         stateAndStats.stats.requestCount++;
//         await this.saveStateAndStatsToDB(stateAndStats);
//         this.telemetryAdapter.collect({ event: type, resourceName: this.options.resourceName });
//     }
// }

// private async resetCounters() {
//     const stateAndStats = await this.getStateAndStatsFromDB();
//     if (stateAndStats) {
//         stateAndStats.stats.failureCount = 0;
//         stateAndStats.stats.timeoutCount = 0;
//         stateAndStats.stats.successCount = 0;
//         await this.saveStateAndStatsToDB(stateAndStats);
//         this.telemetryAdapter.collect({ event: 'resetCounters', resourceName: this.options.resourceName });
//     }
// }

// private async moveToOpenState() {
//     this.state = CircuitBreakerState.OPEN;
//     const stateAndStats = await this.getStateAndStatsFromDB();
//     if (stateAndStats) {
//         stateAndStats.state = this.state;
//         await this.saveStateAndStatsToDB(stateAndStats);
//         this.emit('stateChange', this.state);
//         console.log('Circuit breaker moved to OPEN state.');
//         this.telemetryAdapter.collect({ event: 'stateChange', state: this.state, resourceName: this.options.resourceName });
//     }

//     if (this.options.pingService) {
//         this.startPingingService();
//     } else {
//         setTimeout(() => {
//             this.state = CircuitBreakerState.HALF_OPEN;
//             this.emit('stateChange', this.state);
//             console.log('Circuit breaker moved to HALF_OPEN state.');
//             this.telemetryAdapter.collect({ event: 'stateChange', state: this.state, resourceName: this.options.resourceName });
//         }, this.options.sleepWindow);
//     }
// }

// private startPingingService() {
//     if (this.options.pingService) {
//         this.pingInterval = setInterval(async () => {
//             const isServiceAvailable = await this.options.pingService!();
//             if (isServiceAvailable) {
//                 clearInterval(this.pingInterval!);
//                 this.moveToClosedState();
//             }
//         }, this.options.sleepWindow);
//     }
// }

// private async moveToClosedState() {
//     this.state = CircuitBreakerState.CLOSED;
//     const stateAndStats = await this.getStateAndStatsFromDB();
//     if (stateAndStats) {
//         stateAndStats.state = this.state;
//         await this.saveStateAndStatsToDB(stateAndStats);
//         this.emit('stateChange', this.state);
//         console.log('Circuit breaker moved to CLOSED state.');
//         this.telemetryAdapter.collect({ event: 'stateChange', state: this.state, resourceName: this.options.resourceName });
//     }
// }

// private async handleCommandFailure(error: any) {
//     const isTimeout = error.status === 408 || error.code === 'ResourceExhausted';
//     if (isTimeout) {
//         await this.incrementTimeoutCounter();
//     } else {
//         await this.incrementFailureCounter();
//     }
// }

// private async shouldOpenCircuit() {
//     const stateAndStats = await this.getStateAndStatsFromDB();
//     if (stateAndStats) {
//         const { failureCount, timeoutCount, requestCount } = stateAndStats.stats;
//         return (
//             failureCount >= this.failureThreshold ||
//             timeoutCount >= this.timeoutThreshold ||
//             requestCount >= this.successThreshold
//         );
//     }
//     return false;
// }

// private async shouldMoveToCloseState(): Promise<boolean> {
//     const stateAndStats = await this.getStateAndStatsFromDB();
//     if (!stateAndStats) return false;

//     const { successCount } = stateAndStats.stats;

//     return successCount >= this.successThreshold;
// }

// private async resetSuccessCounter() {
//     const stateAndStats = await this.getStateAndStatsFromDB();
//     if (stateAndStats) {
//         stateAndStats.stats.successCount = 0;
//         await this.saveStateAndStatsToDB(stateAndStats);
//     }
// }

// private async invokeFallback<T>(fallback: (() => Promise<T>) | undefined, error: Error): Promise<T> {
//     if (fallback) {
//         return fallback();
//     } else {
//         throw error;
//     }
// }

// public async setFailureThreshold(threshold: number) {
//     this.failureThreshold = threshold;
// }

// public async setTimeoutThreshold(threshold: number) {
//     this.timeoutThreshold = threshold;
// }

// public async setSuccessThreshold(threshold: number) {
//     this.successThreshold = threshold;
// }

// public async setSleepWindow(sleepWindow: number) {
//     this.options.sleepWindow = sleepWindow;
// }

// public async setFallbackMethod(fallbackMethod: () => any) {
//     this.options.fallbackMethod = fallbackMethod;
// }

// public async setManualState(state: CircuitBreakerState) {
//     this.state = state;
//     const stateAndStats = await this.getStateAndStatsFromDB();
//     if (stateAndStats) {
//         stateAndStats.state = this.state;
//         await this.saveStateAndStatsToDB(stateAndStats);
//     }
// }

// public async currentStatsFromDB(): Promise<CircuitStats> {
//     const stateAndStats = await this.getStateAndStatsFromDB();
//     return stateAndStats ? stateAndStats.stats : {
//         requestCount: 0,
//         failureCount: 0,
//         successCount: 0,
//         timeoutCount: 0,
//     };
// }

// public async currentStateFromDB(): Promise<CircuitBreakerState> {
//     const stateAndStats = await this.getStateAndStatsFromDB();
//     return stateAndStats ? stateAndStats.state : this.state;
// }


// public async execute<T>(command: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
//     await this.waitForInitialization();

//     switch (this.state) {
//         case CircuitBreakerState.OPEN:
//             return this.invokeFallback(fallback, Error('Circuit breaker is in OPEN state. Request blocked.'));

//         case CircuitBreakerState.HALF_OPEN:
//             await this.resetSuccessCounter();
//             try {
//                 const result = await command();
//                 await this.incrementSuccessCounter();
//                 if (await this.shouldMoveToCloseState()) {
//                     await this.moveToClosedState();
//                 }
//                 return result;
//             } catch (error: any) {
//                 await this.handleCommandFailure(error);
//                 return this.invokeFallback(fallback, error);
//             }

//         case CircuitBreakerState.CLOSED:
//         default:
//             try {
//                 const result = await command();
//                 await this.incrementSuccessCounter();
//                 return result;
//             } catch (error: any) {
//                 await this.handleCommandFailure(error);
//                 if (await this.shouldOpenCircuit()) {
//                     await this.moveToOpenState();
//                 }
//                 return this.invokeFallback(fallback, error);
//             }
//     }
// }
// }

// export { CircuitBreaker, CircuitBreakerSingleton, CircuitBreakerState ,CircuitBreakerOptions};


import { LoggingAdapter } from '../adapters/LoggingAdapter';
import { TelemetryAdapter } from '../adapters/TelemetryAdapter';

export class CircuitBreaker {
    constructor(
        failureThreshold: number,
        recoveryTimeout: number,
        checkFunction: Function,
        loggingAdapter: LoggingAdapter,
        telemetryAdapter: TelemetryAdapter
    ) {

    }

    execute(func: Function, ...args: any[]): any {
        return null;
    }
}