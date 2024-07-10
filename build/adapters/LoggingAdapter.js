"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultLoggingAdapter = void 0;
class DefaultLoggingAdapter {
    log(message) {
        console.log(`Log: ${message}`);
    }
}
exports.DefaultLoggingAdapter = DefaultLoggingAdapter;
