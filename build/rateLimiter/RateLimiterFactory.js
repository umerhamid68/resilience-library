"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiterFactory = void 0;
exports.createRateLimiter = createRateLimiter;
const SlidingWindowStrategy_1 = require("./SlidingWindowStrategy");
const LeakyBucketStrategy_1 = require("./LeakyBucketStrategy");
class RateLimiterFactory {
    createRateLimiter(strategyType, options) {
        switch (strategyType) {
            case 'sliding_window':
                return new SlidingWindowStrategy_1.SlidingWindowStrategy.SlidingWindowStrategy(options.maxRequests, options.windowSize, options.segmentSize, options.dbPath);
            case 'leaky_bucket':
                return new LeakyBucketStrategy_1.LeakyBucketStrategy.LeakyBucketStrategy(options.maxRequests, options.leakRate, options.dbPath);
            default:
                throw new Error(`Unknown strategy type: ${strategyType}`);
        }
    }
}
exports.RateLimiterFactory = RateLimiterFactory;
function createRateLimiter(strategyType, options) {
    switch (strategyType) {
        case 'sliding_window':
            return new SlidingWindowStrategy_1.SlidingWindowStrategy.SlidingWindowStrategy(options.maxRequests, options.windowSize, options.segmentSize, options.dbPath);
        case 'leaky_bucket':
            return new LeakyBucketStrategy_1.LeakyBucketStrategy.LeakyBucketStrategy(options.maxRequests, options.leakRate, options.dbPath);
        default:
            throw new Error(`Unknown strategy type: ${strategyType}`);
    }
}
