"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = void 0;
class CircuitBreaker {
    constructor(failureThreshold, recoveryTimeout, checkFunction, loggingAdapter, telemetryAdapter) {
    }
    call(func, ...args) {
        return null;
    }
}
exports.CircuitBreaker = CircuitBreaker;
