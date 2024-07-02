"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientSDK = void 0;
class ClientSDK {
    constructor(rateLimiter, circuitBreaker, semaphore, loggingAdapter, telemetryAdapter) {
        this.rateLimiter = rateLimiter;
        this.circuitBreaker = circuitBreaker;
        this.semaphore = semaphore;
        this.loggingAdapter = loggingAdapter;
        this.telemetryAdapter = telemetryAdapter;
    }
    hitRateLimiter(clientId) {
        return this.rateLimiter.hit(clientId);
    }
    checkRateLimiter(clientId) {
        return this.rateLimiter.check(clientId);
    }
    callCircuitBreaker(func, ...args) {
        return this.circuitBreaker.call(func, ...args);
    }
    acquireSemaphore() {
        return this.semaphore.acquire();
    }
    releaseSemaphore() {
        this.semaphore.release();
    }
}
exports.ClientSDK = ClientSDK;
