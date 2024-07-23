function isFixedWindowCounterOptions(options: RateLimiterOptions): options is FixedWindowCounterOptions {
    return options.type === 'fixed_window';
}

function isLeakyBucketOptions(options: RateLimiterOptions): options is LeakyBucketOptions {
    return options.type === 'leaky_bucket';
}

function isTokenBucketOptions(options: RateLimiterOptions): options is TokenBucketOptions {
    return options.type === 'token_bucket';
}



/////////////////////////////////refined interfaces approach
import { RateLimitingStrategy } from './rateLimiter/RateLimitingStrategy';
import { LeakyBucketStrategy } from './rateLimiter/LeakyBucketStrategy';
import { TokenBucketStrategy } from './rateLimiter/TokenBucketStrategy';
import { FixedWindowCounterStrategy } from './rateLimiter/FixedWindowCounter';
import { FixedWindowCounterOptions, LeakyBucketOptions, TokenBucketOptions, RateLimiterOptions } from './rateLimiter/RateLimitingStrategyOptions';
import { IPolicy, IPolicyContext } from './Policy';

export class RateLimiter implements IPolicy {
    private strategy: RateLimitingStrategy;

    public beforeExecut?: (context: IPolicyContext) => Promise<void>;
    public afterExecute?: (context: IPolicyContext) => Promise<void>;

    constructor(strategy: RateLimitingStrategy) {
        this.strategy = strategy;
    }

    static create(options: RateLimiterOptions): RateLimiter {
        let strategy: RateLimitingStrategy;

        if (isTokenBucketOptions(options)) {
            strategy = new TokenBucketStrategy.TokenBucketStrategy(options);
        } else if (isLeakyBucketOptions(options)) {
            strategy = new LeakyBucketStrategy.LeakyBucketStrategy(options);
        } else if (isFixedWindowCounterOptions(options)) {
            strategy = new FixedWindowCounterStrategy.FixedWindowCounterStrategy(options);
        } else {
            throw new Error(`Unknown strategy options: ${JSON.stringify(options)}`);
        }

        return new RateLimiter(strategy);
    }

    async execute<T>(fn: (context: IPolicyContext) => PromiseLike<T> | T, signal: AbortSignal = new AbortController().signal): Promise<T> {
        const clientId = 'defaultClientId'; // Use a default clientId or pass it as an argument if needed
        const isAllowed = await this.hit(clientId);
        if (isAllowed) {
            if (this.beforeExecut) await this.beforeExecut({ signal });
            const result = await fn({ signal });
            if (this.afterExecute) await this.afterExecute({ signal });
            return result;
        } else {
            throw new Error('Rate limit exceeded');
        }
    }

    async hit(clientId: string): Promise<boolean> {
        const result = await this.strategy.hit(clientId);
        const event = result ? 'request_allowed' : 'rate_limit_exceeded';
        console.log(`${event} for client: ${clientId}`);
        console.log({ event, clientId });
        return result;
    }

    async check(clientId: string): Promise<boolean> {
        const result = await this.strategy.check(clientId);
        console.log(`Check request for client: ${clientId}, allowed: ${result}`);
        console.log({ event: 'check_request', clientId, allowed: result });
        return result;
    }
}
