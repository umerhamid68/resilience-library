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
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.rateLimiter.hit(clientId);
        });
    }
    checkRateLimiter(clientId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.rateLimiter.check(clientId);
        });
    }
    callCircuitBreaker(func, ...args) {
        return this.circuitBreaker.call(func, ...args);
    }
    acquireSemaphore() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.semaphore.acquire();
        });
    }
    releaseSemaphore() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.semaphore.release();
        });
    }
}
exports.ClientSDK = ClientSDK;
