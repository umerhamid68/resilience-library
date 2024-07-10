"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = createRateLimiter;
const LeakyBucketStrategy_1 = require("./LeakyBucketStrategy");
const TokenBucketStrategy_1 = require("./TokenBucketStrategy");
const FixedWindowCounter_1 = require("./FixedWindowCounter");
function createRateLimiter(strategyType, options) {
    switch (strategyType) {
        case 'leaky_bucket':
            return new LeakyBucketStrategy_1.LeakyBucketStrategy.LeakyBucketStrategy(options.maxRequests, options.dbPath, options.key, options.resetThresholdInMillis, options.loggingAdapter, options.telemetryAdapter);
        case 'token_bucket':
            return new TokenBucketStrategy_1.TokenBucketStrategy.TokenBucketStrategy(options.maxTokens, options.refillRate, options.dbPath, options.key, options.resetThresholdInMillis, options.loggingAdapter, options.telemetryAdapter);
        case 'fixed_window':
            return new FixedWindowCounter_1.FixedWindowCounterStrategy.FixedWindowCounterStrategy(options.maxRequests, options.windowSizeInMillis, options.dbPath, options.key, options.loggingAdapter, options.telemetryAdapter);
        default:
            throw new Error(`Unknown strategy type: ${strategyType}`);
    }
}
