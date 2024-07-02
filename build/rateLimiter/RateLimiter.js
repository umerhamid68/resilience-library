"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = void 0;
class RateLimiter {
    constructor(strategy, loggingAdapter, telemetryAdapter) {
        this.strategy = strategy;
        this.loggingAdapter = loggingAdapter;
        this.telemetryAdapter = telemetryAdapter;
    }
    hit(clientId) {
        return false;
    }
    check(clientId) {
        return false;
    }
    access(clientId) {
        return false;
    }
}
exports.RateLimiter = RateLimiter;
