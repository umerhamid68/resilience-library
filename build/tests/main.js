"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ClientSDK_1 = require("../ClientSDK/ClientSDK");
const RateLimiterFactory_1 = require("../rateLimiter/RateLimiterFactory");
const RateLimiter_1 = require("../rateLimiter/RateLimiter");
const CircuitBreaker_1 = require("../circuitBreaker/CircuitBreaker");
const Semaphore_1 = require("../semaphore/Semaphore");
const LoggingAdapter_1 = require("../adapters/LoggingAdapter");
const TelemetryAdapter_1 = require("../adapters/TelemetryAdapter");
const loggingAdapter = new LoggingAdapter_1.DefaultLoggingAdapter();
const telemetryAdapter = new TelemetryAdapter_1.DefaultTelemetryAdapter();
// Rate limiter using factory
const rateLimiterStrategy = (0, RateLimiterFactory_1.createRateLimiter)('leaky_bucket', {
    maxRequests: 10,
    dbPath: './rateLimiterDB',
    key: 'api/endpoint10',
    resetThresholdInMillis: 3600000, // 1 hour threshold
    loggingAdapter,
    telemetryAdapter
});
const rateLimiter = new RateLimiter_1.RateLimiter(rateLimiterStrategy, loggingAdapter, telemetryAdapter);
// Circuit breaker options
const circuitBreakerOptions = {
    resourceName: 'ResourceService',
    rollingWindowSize: 60000,
    requestVolumeThreshold: 10,
    errorThresholdPercentage: 50,
    sleepWindow: 3000,
};
const circuitBreaker = CircuitBreaker_1.CircuitBreakerSingleton.getInstance(circuitBreakerOptions, loggingAdapter, telemetryAdapter);
// Semaphore
const semaphore = new Semaphore_1.Semaphore(2, './semaphoreDB', 'resource_key', loggingAdapter, telemetryAdapter);
const clientSDK = new ClientSDK_1.ClientSDK(rateLimiter, circuitBreaker, semaphore, loggingAdapter, telemetryAdapter);
// Simulated service calls
function failingServiceCall() {
    return new Promise((resolve, reject) => {
        reject(new Error('Service call failed'));
    });
}
function timeoutServiceCall() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const error = new Error('Too Many Requests');
            error.status = 408; // Attach a status property to the error
            reject(error); // Simulate HTTP 429 error
        }, 1000);
    });
}
function successfulServiceCall() {
    return new Promise((resolve) => {
        resolve('Service called successfully');
    });
}
// Test functions
function testFallbackMethod() {
    return __awaiter(this, void 0, void 0, function* () {
        yield circuitBreaker.setManualState(CircuitBreaker_1.CircuitBreakerState.OPEN);
        try {
            const fallbackResult = yield clientSDK.callCircuitBreaker(successfulServiceCall);
            console.log(`Fallback Result: ${fallbackResult}`);
        }
        catch (error) {
            console.error('Error during fallback method test:', error);
        }
    });
}
function testPingService() {
    return __awaiter(this, void 0, void 0, function* () {
        yield circuitBreaker.setManualState(CircuitBreaker_1.CircuitBreakerState.OPEN);
        try {
            const pingResult = yield clientSDK.callCircuitBreaker(successfulServiceCall);
            console.log(`Ping Result: ${pingResult}`);
        }
        catch (error) {
            console.error('Error during ping service test:', error);
        }
    });
}
function testServiceCall(serviceCall) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield clientSDK.callCircuitBreaker(serviceCall);
            console.log(`Success: ${result}`);
        }
        catch (error) {
            console.log(`Error: ${error.message}`);
        }
    });
}
// Semaphore test functions
function testSemaphoreAcquire() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const acquired = yield semaphore.acquire();
            if (acquired) {
                console.log('Semaphore acquired successfully.');
            }
            else {
                console.log('Semaphore limit reached. Cannot acquire.');
            }
        }
        catch (error) {
            console.error('Error during semaphore acquire:', error);
        }
    });
}
function testSemaphoreRelease() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield semaphore.release();
            console.log('Semaphore released successfully.');
        }
        catch (error) {
            console.error('Error during semaphore release:', error);
        }
    });
}
// Rate limiter test functions
function testRateLimiterHit(clientId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (yield clientSDK.hitRateLimiter(clientId)) {
                console.log('Rate limit check passed. Processing request...');
            }
            else {
                console.log('Rate limit exceeded. Try again later.');
            }
        }
        catch (error) {
            console.error('Error during rate limiter hit:', error);
        }
    });
}
function testRateLimiterCheck(clientId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const allowed = yield clientSDK.checkRateLimiter(clientId);
            console.log(`Request allowed: ${allowed}`);
        }
        catch (error) {
            console.error('Error during rate limiter check:', error);
        }
    });
}
// Main function
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Starting main function');
        try {
            // Test successful service calls
            console.log('Testing successful service calls');
            yield testServiceCall(successfulServiceCall);
            // Test failing service calls
            console.log('Testing failing service calls');
            yield testServiceCall(failingServiceCall);
            // Test timeout service calls
            console.log('Testing timeout service calls');
            yield testServiceCall(timeoutServiceCall);
            // Test fallback method
            console.log('Testing fallback method');
            yield testFallbackMethod();
            // Test ping service
            console.log('Testing ping service');
            yield testPingService();
            // Log current state from DB
            console.log('Current Circuit Breaker State:', yield circuitBreaker.currentStateFromDB());
            // Test semaphore acquire
            console.log('Testing semaphore acquire');
            yield testSemaphoreAcquire();
            // Test semaphore release
            console.log('Testing semaphore release');
            yield testSemaphoreRelease();
            // Test rate limiter hit
            console.log('Testing rate limiter hit');
            yield testRateLimiterHit('testClient');
            // Test rate limiter check
            console.log('Testing rate limiter check');
            yield testRateLimiterCheck('testClient');
            console.log('Main function completed');
        }
        catch (error) {
            console.error('Unexpected error:', error);
        }
    });
}
main().catch(error => {
    console.error('Unexpected error in main:', error);
});
