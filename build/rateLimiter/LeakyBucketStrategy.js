"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeakyBucketStrategy = void 0;
var LeakyBucketStrategy;
(function (LeakyBucketStrategy_1) {
    class LeakyBucketStrategy {
        constructor(maxRequests, leakRate, dbPath) {
        }
        hit(clientId) {
            return false;
        }
        check(clientId) {
            return false;
        }
    }
    LeakyBucketStrategy_1.LeakyBucketStrategy = LeakyBucketStrategy;
})(LeakyBucketStrategy || (exports.LeakyBucketStrategy = LeakyBucketStrategy = {}));
