"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Semaphore = void 0;
class Semaphore {
    constructor(maxConcurrent, loggingAdapter, telemetryAdapter) {
    }
    acquire() {
        return false;
    }
    release() {
    }
}
exports.Semaphore = Semaphore;
