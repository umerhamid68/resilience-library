// ///////////////////////////////////////////////using db correctly
// import { RateLimitingStrategy } from './RateLimitingStrategy';
// import { LoggingAdapter } from '../adapters/LoggingAdapter';
// import { TelemetryAdapter } from '../adapters/TelemetryAdapter';

// export class RateLimiter {
//     private strategy: RateLimitingStrategy;
//     private loggingAdapter: LoggingAdapter;
//     private telemetryAdapter: TelemetryAdapter;

//     constructor(
//         strategy: RateLimitingStrategy,
//         loggingAdapter: LoggingAdapter,
//         telemetryAdapter: TelemetryAdapter
//     ) {
//         this.strategy = strategy;
//         this.loggingAdapter = loggingAdapter;
//         this.telemetryAdapter = telemetryAdapter;
//     }

//     async hit(clientId: string): Promise<boolean> {
//         const result = await this.strategy.hit(clientId);
//         const event = result ? 'request_allowed' : 'rate_limit_exceeded';
//         this.loggingAdapter.log(`${event} for client: ${clientId}`);
//         this.telemetryAdapter.collect({ event, clientId });
//         return result;
//     }

//     async check(clientId: string): Promise<boolean> {
//         const result = await this.strategy.check(clientId);
//         this.loggingAdapter.log(`Check request for client: ${clientId}, allowed: ${result}`);
//         this.telemetryAdapter.collect({ event: 'check_request', clientId, allowed: result });
//         return result;
//     }

//     async access(clientId: string): Promise<boolean> {
//         const isAllowed = await this.check(clientId);
//         if (isAllowed) {
//             return await this.hit(clientId);
//         }
//         return false;
//     }
// }


//////////////////////////////////////////static factory method approach
/*import { RateLimitingStrategy } from './RateLimitingStrategy';
import { LeakyBucketStrategy } from './LeakyBucketStrategy';
import { TokenBucketStrategy } from './TokenBucketStrategy';
import { FixedWindowCounterStrategy } from './FixedWindowCounter';
import { DefaultLoggingAdapter, LoggingAdapter } from '../adapters/LoggingAdapter';
import { DefaultTelemetryAdapter, TelemetryAdapter } from '../adapters/TelemetryAdapter';

export class RateLimiter {
    private strategy: RateLimitingStrategy;
    private loggingAdapter: LoggingAdapter;
    private telemetryAdapter: TelemetryAdapter;

    constructor(
        strategy: RateLimitingStrategy,
        loggingAdapter: LoggingAdapter,
        telemetryAdapter: TelemetryAdapter
    ) {
        this.strategy = strategy;
        this.loggingAdapter = loggingAdapter;
        this.telemetryAdapter = telemetryAdapter;
    }

    static create(
        strategyType: string,
        options: any
    ): RateLimiter {
        const loggingAdapter = options.loggingAdapter || new DefaultLoggingAdapter();
        const telemetryAdapter = options.telemetryAdapter || new DefaultTelemetryAdapter();

        let strategy: RateLimitingStrategy;
        switch (strategyType) {
            case 'leaky_bucket':
                strategy = new LeakyBucketStrategy.LeakyBucketStrategy(options.maxRequests, options.dbPath, options.key, options.resetThresholdInMillis, loggingAdapter, telemetryAdapter);
                break;
            case 'token_bucket':
                strategy = new TokenBucketStrategy.TokenBucketStrategy(options.maxTokens, options.refillRate, options.dbPath, options.key, loggingAdapter, telemetryAdapter);
                break;
            case 'fixed_window':
                strategy = new FixedWindowCounterStrategy.FixedWindowCounterStrategy(options.maxRequests, options.windowSizeInMillis, options.dbPath, options.key, loggingAdapter, telemetryAdapter);
                break;
            default:
                throw new Error(`Unknown strategy type: ${strategyType}`);
        }

        return new RateLimiter(strategy, loggingAdapter, telemetryAdapter);
    }

    async hit(clientId: string): Promise<boolean> {
        const result = await this.strategy.hit(clientId);
        const event = result ? 'request_allowed' : 'rate_limit_exceeded';
        this.loggingAdapter.log(`${event} for client: ${clientId}`);
        this.telemetryAdapter.collect({ event, clientId });
        return result;
    }

    async check(clientId: string): Promise<boolean> {
        const result = await this.strategy.check(clientId);
        this.loggingAdapter.log(`Check request for client: ${clientId}, allowed: ${result}`);
        this.telemetryAdapter.collect({ event: 'check_request', clientId, allowed: result });
        return result;
    }

    async access(clientId: string): Promise<boolean> {
        const isAllowed = await this.check(clientId);
        if (isAllowed) {
            return await this.hit(clientId);
        }
        return false;
    }
}
*/



//////////////////////////////////////////////by using ipolicy
import { RateLimitingStrategy } from './rateLimiter/RateLimitingStrategy';
import { LeakyBucketStrategy } from './rateLimiter/LeakyBucketStrategy';
import { TokenBucketStrategy } from './rateLimiter/TokenBucketStrategy';
import { FixedWindowCounterStrategy } from './rateLimiter/FixedWindowCounter';
import { DefaultLoggingAdapter, LoggingAdapter } from './adapters/LoggingAdapter';
import { DefaultTelemetryAdapter, TelemetryAdapter } from './adapters/TelemetryAdapter';
import { IPolicy, IPolicyContext } from './Policy';

export class RateLimiter implements IPolicy {
    private strategy: RateLimitingStrategy;
    private loggingAdapter: LoggingAdapter;
    private telemetryAdapter: TelemetryAdapter;

    constructor(strategy: RateLimitingStrategy, loggingAdapter: LoggingAdapter, telemetryAdapter: TelemetryAdapter) {
        this.strategy = strategy;
        this.loggingAdapter = loggingAdapter;
        this.telemetryAdapter = telemetryAdapter;
    }

    static create(strategyType: string, options: any): RateLimiter {
        const loggingAdapter = options.loggingAdapter || new DefaultLoggingAdapter();
        const telemetryAdapter = options.telemetryAdapter || new DefaultTelemetryAdapter();

        let strategy: RateLimitingStrategy;
        switch (strategyType) {
            case 'leaky_bucket':
                strategy = new LeakyBucketStrategy.LeakyBucketStrategy(options.maxRequests, options.dbPath, options.key, options.resetThresholdInMillis, loggingAdapter, telemetryAdapter);
                break;
            case 'token_bucket':
                strategy = new TokenBucketStrategy.TokenBucketStrategy(options.maxTokens, options.refillRate, options.dbPath, options.key, loggingAdapter, telemetryAdapter);
                break;
            case 'fixed_window':
                strategy = new FixedWindowCounterStrategy.FixedWindowCounterStrategy(options.maxRequests, options.windowSizeInMillis, options.dbPath, options.key, loggingAdapter, telemetryAdapter);
                break;
            default:
                throw new Error(`Unknown strategy type: ${strategyType}`);
        }

        return new RateLimiter(strategy, loggingAdapter, telemetryAdapter);
    }

    async execute<T>(fn: (context: IPolicyContext) => PromiseLike<T> | T, signal: AbortSignal = new AbortController().signal): Promise<T> {
        const clientId = 'defaultClientId'; // Use a default clientId or pass it as an argument if needed
        const isAllowed = await this.hit(clientId);
        if (isAllowed) {
            return await fn({ signal });
        } else {
            throw new Error('Rate limit exceeded');
        }
    }

    async hit(clientId: string): Promise<boolean> {
        const result = await this.strategy.hit(clientId);
        const event = result ? 'request_allowed' : 'rate_limit_exceeded';
        this.loggingAdapter.log(`${event} for client: ${clientId}`);
        this.telemetryAdapter.collect({ event, clientId });
        return result;
    }

    async check(clientId: string): Promise<boolean> {
        const result = await this.strategy.check(clientId);
        this.loggingAdapter.log(`Check request for client: ${clientId}, allowed: ${result}`);
        this.telemetryAdapter.collect({ event: 'check_request', clientId, allowed: result });
        return result;
    }
}


