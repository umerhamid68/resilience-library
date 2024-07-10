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
const LoggingAdapter_1 = require("../adapters/LoggingAdapter");
const TelemetryAdapter_1 = require("../adapters/TelemetryAdapter");
function runTokenBucketTest() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Starting Token Bucket Rate Limiter Test...');
        const loggingAdapter = new LoggingAdapter_1.LoggingAdapter();
        const telemetryAdapter = new TelemetryAdapter_1.TelemetryAdapter();
        const dbPath = './tokenBucketDB';
        const key = 'api/endpoint';
        const tokenBucket = new TokenBucketStrategy_1.TokenBucketStrategy.TokenBucketStrategy(10, //maxTokens
        1, //per second
        dbPath, key, 3600000, loggingAdapter, telemetryAdapter);
        try {
            // await tokenBucket['dbReady'];
            // console.log('Database opened successfully.');
            // console.log('here');
            for (let i = 1; i <= 15; i++) {
                try {
                    console.log('here 2');
                    const allowed = yield tokenBucket.hit(`testClient${i}`);
                    console.log(`Hit attempt ${i}: ${allowed ? 'Allowed' : 'Denied'}`);
                }
                catch (err) {
                    console.error(`Error during hit attempt ${i}:`, err);
                }
            }
        }
        catch (error) {
            console.error('Error during rate limiter tests:', error);
        }
    });
}
runTokenBucketTest();
