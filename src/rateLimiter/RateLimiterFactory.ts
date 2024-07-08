///////////////////////////////////////////with fixed window
import { RateLimitingStrategy } from './RateLimitingStrategy';
import { LeakyBucketStrategy } from './LeakyBucketStrategy';
import { TokenBucketStrategy } from './TokenBucketStrategy';
import { FixedWindowCounterStrategy } from './FixedWindowCounter';

export function createRateLimiter(strategyType: string, options: any): RateLimitingStrategy {
    switch (strategyType) {
        // case 'leaky_bucket':
        //     return new LeakyBucketStrategy.LeakyBucketStrategy(options.maxRequests, options.leakRate, options.dbPath, options.key);
        case 'token_bucket':
            return new TokenBucketStrategy.TokenBucketStrategy(options.maxTokens, options.refillRate, options.dbPath, options.key, options.resetThresholdInMillis);
        case 'fixed_window':
            return new FixedWindowCounterStrategy.FixedWindowCounterStrategy(options.maxRequests, options.windowSizeInMillis, options.dbPath, options.key);
        default:
            throw new Error(`Unknown strategy type: ${strategyType}`);
    }
}
