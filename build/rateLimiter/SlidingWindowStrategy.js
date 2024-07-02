"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlidingWindowStrategy = void 0;
var SlidingWindowStrategy;
(function (SlidingWindowStrategy_1) {
    class SlidingWindowStrategy {
        constructor(maxRequests, windowSize, segmentSize, dbPath) {
        }
        hit(clientId) {
            return false;
        }
        check(clientId) {
            return false;
        }
    }
    SlidingWindowStrategy_1.SlidingWindowStrategy = SlidingWindowStrategy;
})(SlidingWindowStrategy || (exports.SlidingWindowStrategy = SlidingWindowStrategy = {}));
