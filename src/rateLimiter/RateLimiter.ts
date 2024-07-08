///////////////////////////////////////////////using db correctly
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

    async hit(clientId: string): Promise<boolean> {
        const result = await this.strategy.hit(clientId);
        const event = result ? 'request_allowed' : 'rate_limit_exceeded';
        this.loggingAdapter.log(`${event} for client: ${clientId}`);
        this.telemetryAdapter.collect({ event, clientId });
        return result;
    }

    async check(clientId: string): Promise<boolean> {
        const result = await this.strategy.check(clientId);
        this.loggingAdapter.log(`Check request for client: ${clientId}, allowed: ${result}`);
        this.telemetryAdapter.collect({ event: 'check_request', clientId, allowed: result });
        return result;
    }

    async access(clientId: string): Promise<boolean> {
        const isAllowed = await this.check(clientId);
        if (isAllowed) {
            return await this.hit(clientId);
        }
        return false;
    }
}

