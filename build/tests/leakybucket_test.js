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
const LeakyBucketStrategy_1 = require("../rateLimiter/LeakyBucketStrategy");
const LoggingAdapter_1 = require("../adapters/LoggingAdapter");
const TelemetryAdapter_1 = require("../adapters/TelemetryAdapter");
function runLeakyBucketTest() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Starting Leaky Bucket Rate Limiter Test...');
        const loggingAdapter = new LoggingAdapter_1.DefaultLoggingAdapter();
        const telemetryAdapter = new TelemetryAdapter_1.DefaultTelemetryAdapter();
        const dbPath = './leakyBucketDB';
        const key = 'api/endpoint7';
        const leakyBucket = new LeakyBucketStrategy_1.LeakyBucketStrategy.LeakyBucketStrategy(10, //maxRequests
        dbPath, key, 10000, loggingAdapter, telemetryAdapter);
        try {
            // Give some time for the database to be ready
            yield leakyBucket['dbReady'];
            console.log('Database opened successfully.');
            for (let i = 1; i <= 15; i++) {
                try {
                    const allowed = yield leakyBucket.hit(`testClient${i}`);
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
runLeakyBucketTest();
