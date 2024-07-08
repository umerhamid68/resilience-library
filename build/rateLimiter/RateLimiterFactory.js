"use strict";
/*import { RateLimitingStrategy } from './RateLimitingStrategy';
//import { SlidingWindowStrategy } from './SlidingWindowStrategy';
import { LeakyBucketStrategy } from './LeakyBucketStrategy';
import { TokenBucketStrategy } from './TokenBucketStrategy';

export function createRateLimiter(strategyType: string, options: any): RateLimitingStrategy {
    switch (strategyType) {
        // case 'sliding_window':
        //     return new SlidingWindowStrategy.SlidingWindowStrategy(options.maxRequests, options.windowSize, options.segmentSize, options.dbPath);
        case 'leaky_bucket':
            return new LeakyBucketStrategy.LeakyBucketStrategy(options.maxRequests, options.leakRate, options.dbPath);
        case 'token_bucket':
            return new TokenBucketStrategy.TokenBucketStrategy(options.maxTokens, options.refillRate, options.dbPath);
        default:
            throw new Error(`Unknown strategy type: ${strategyType}`);
    }
}*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = createRateLimiter;
const TokenBucketStrategy_1 = require("./TokenBucketStrategy");
const FixedWindowCounter_1 = require("./FixedWindowCounter");
function createRateLimiter(strategyType, options) {
    switch (strategyType) {
        // case 'leaky_bucket':
        //     return new LeakyBucketStrategy.LeakyBucketStrategy(options.maxRequests, options.leakRate, options.dbPath, options.key);
        case 'token_bucket':
            return new TokenBucketStrategy_1.TokenBucketStrategy.TokenBucketStrategy(options.maxTokens, options.refillRate, options.dbPath, options.key, options.resetThresholdInMillis);
        case 'fixed_window':
            return new FixedWindowCounter_1.FixedWindowCounterStrategy.FixedWindowCounterStrategy(options.maxRequests, options.windowSizeInMillis, options.dbPath, options.key);
        default:
            throw new Error(`Unknown strategy type: ${strategyType}`);
    }
}
