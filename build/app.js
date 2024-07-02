"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ClientSDK_1 = require("./ClientSDK/ClientSDK");
const RateLimiter_1 = require("./rateLimiter/RateLimiter");
const RateLimiterFactory_1 = require("./rateLimiter/RateLimiterFactory");
const CircuitBreaker_1 = require("./circuitBreaker/CircuitBreaker");
const Semaphore_1 = require("./semaphore/Semaphore");
const LoggingAdapter_1 = require("./adapters/LoggingAdapter");
const TelemetryAdapter_1 = require("./adapters/TelemetryAdapter");
const loggingAdapter = new LoggingAdapter_1.LoggingAdapter();
const telemetryAdapter = new TelemetryAdapter_1.TelemetryAdapter();
//ratelimiter using factory
const rateLimiterStrategy = (0, RateLimiterFactory_1.createRateLimiter)('sliding_window', {
    maxRequests: 10,
    windowSize: 60,
    segmentSize: 10,
    dbPath: './rateLimiterDB'
});
const rateLimiter = new RateLimiter_1.RateLimiter(rateLimiterStrategy, loggingAdapter, telemetryAdapter);
const circuitBreaker = new CircuitBreaker_1.CircuitBreaker(5, 60000, () => true, loggingAdapter, telemetryAdapter);
const semaphore = new Semaphore_1.Semaphore(3, loggingAdapter, telemetryAdapter);
const clientSDK = new ClientSDK_1.ClientSDK(rateLimiter, circuitBreaker, semaphore, loggingAdapter, telemetryAdapter);
//example function to call with Circuit Breaker
function exampleServiceCall() {
    console.log('Service called successfully');
}
function main() {
    const clientId = 'client_123';
    if (clientSDK.hitRateLimiter(clientId)) {
        console.log('Rate limit check passed.');
    }
    else {
        console.log('Rate limit exceeded.');
    }
    try {
        clientSDK.callCircuitBreaker(exampleServiceCall);
    }
    catch (error) {
        console.log('Circuit breaker is open.');
    }
    if (clientSDK.acquireSemaphore()) {
        try {
            console.log('Semaphore acquired.');
        }
        finally {
            clientSDK.releaseSemaphore();
            console.log('Semaphore released.');
        }
    }
    else {
        console.log('Semaphore acquisition failed.');
    }
}
main();
