import { RateLimitingStrategy } from './RateLimitingStrategy';
import { SlidingWindowStrategy } from './SlidingWindowStrategy';
import { LeakyBucketStrategy } from './LeakyBucketStrategy';

export class RateLimiterFactory {
    createRateLimiter(strategyType: string, options: any): RateLimitingStrategy {
        switch (strategyType) {
            case 'sliding_window':
                return new SlidingWindowStrategy.SlidingWindowStrategy(options.maxRequests, options.windowSize, options.segmentSize, options.dbPath);
            case 'leaky_bucket':
                return new LeakyBucketStrategy.LeakyBucketStrategy(options.maxRequests, options.leakRate, options.dbPath);
            default:
                throw new Error(`Unknown strategy type: ${strategyType}`);
        }
    }
}
export function createRateLimiter(strategyType: string, options: any): RateLimitingStrategy {
    switch (strategyType) {
        case 'sliding_window':
            return new SlidingWindowStrategy.SlidingWindowStrategy(options.maxRequests, options.windowSize, options.segmentSize, options.dbPath);
        case 'leaky_bucket':
            return new LeakyBucketStrategy.LeakyBucketStrategy(options.maxRequests, options.leakRate, options.dbPath);
        default:
            throw new Error(`Unknown strategy type: ${strategyType}`);
    }
}