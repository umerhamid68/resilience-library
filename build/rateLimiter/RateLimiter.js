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
exports.RateLimiter = void 0;
class RateLimiter {
    constructor(strategy, loggingAdapter, telemetryAdapter) {
        this.strategy = strategy;
        this.loggingAdapter = loggingAdapter;
        this.telemetryAdapter = telemetryAdapter;
    }
    hit(clientId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.strategy.hit(clientId);
            const event = result ? 'request_allowed' : 'rate_limit_exceeded';
            this.loggingAdapter.log(`${event} for client: ${clientId}`);
            this.telemetryAdapter.collect({ event, clientId });
            return result;
        });
    }
    check(clientId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.strategy.check(clientId);
            this.loggingAdapter.log(`Check request for client: ${clientId}, allowed: ${result}`);
            this.telemetryAdapter.collect({ event: 'check_request', clientId, allowed: result });
            return result;
        });
    }
    access(clientId) {
        return __awaiter(this, void 0, void 0, function* () {
            const isAllowed = yield this.check(clientId);
            if (isAllowed) {
                return yield this.hit(clientId);
            }
            return false;
        });
    }
}
exports.RateLimiter = RateLimiter;
