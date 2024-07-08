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
const TokenBucketStrategy_1 = require("../rateLimiter/TokenBucketStrategy");
const FixedWindowCounter_1 = require("../rateLimiter/FixedWindowCounter");
const LoggingAdapter_1 = require("../adapters/LoggingAdapter");
const TelemetryAdapter_1 = require("../adapters/TelemetryAdapter");
const loggingAdapter = new LoggingAdapter_1.LoggingAdapter();
const telemetryAdapter = new TelemetryAdapter_1.TelemetryAdapter();
function testTokenBucketRateLimiter() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Starting Token Bucket Rate Limiter Test...');
        const rateLimiter = new TokenBucketStrategy_1.TokenBucketStrategy.TokenBucketStrategy(10, // max
        1, //per second
        './tokenBucketDB', 'api/endpoint');
        for (let i = 0; i < 12; i++) {
            try {
                const allowed = yield rateLimiter.hit('testClient');
                console.log(`Hit attempt ${i + 1}: ${allowed ? 'Allowed' : 'Denied'}`);
            }
            catch (error) {
                console.error(`Error during hit attempt ${i + 1}:`, error);
            }
        }
        const finalCheck = yield rateLimiter.check('testClient');
        console.log(`Final check: ${finalCheck ? 'Allowed' : 'Denied'}`);
    });
}
function testFixedWindowRateLimiter() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Starting Fixed Window Rate Limiter Test...');
        const rateLimiter = new FixedWindowCounter_1.FixedWindowCounterStrategy.FixedWindowCounterStrategy(5, //max
        60000, //window size 
        './fixedWindowDB', 'api/endpoint');
        for (let i = 0; i < 7; i++) {
            try {
                const allowed = yield rateLimiter.hit('testClient');
                console.log(`Hit attempt ${i + 1}: ${allowed ? 'Allowed' : 'Denied'}`);
            }
            catch (error) {
                console.error(`Error during hit attempt ${i + 1}:`, error);
            }
        }
        const finalCheck = yield rateLimiter.check('testClient');
        console.log(`Final check: ${finalCheck ? 'Allowed' : 'Denied'}`);
    });
}
function runTests() {
    return __awaiter(this, void 0, void 0, function* () {
        yield testTokenBucketRateLimiter();
        yield testFixedWindowRateLimiter();
    });
}
runTests().catch((err) => {
    console.error('Error during rate limiter tests:', err);
});
