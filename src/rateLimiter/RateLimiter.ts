import { RateLimitingStrategy } from './RateLimitingStrategy';
import { LoggingAdapter } from '../adapters/LoggingAdapter';
import { TelemetryAdapter } from '../adapters/TelemetryAdapter';

export class RateLimiter {
    private strategy: RateLimitingStrategy;
    private loggingAdapter: LoggingAdapter;
    private telemetryAdapter: TelemetryAdapter;

    constructor(
        strategy: RateLimitingStrategy,
        loggingAdapter: LoggingAdapter,
        telemetryAdapter: TelemetryAdapter
    ) {
        this.strategy = strategy;
        this.loggingAdapter = loggingAdapter;
        this.telemetryAdapter = telemetryAdapter;
    }

    hit(clientId: string): boolean {
        return false;
    }

    check(clientId: string): boolean {
        return false;
    }

    access(clientId: string): boolean {
        return false;
    }
}
