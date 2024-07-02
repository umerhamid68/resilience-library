import { RateLimiter } from '../rateLimiter/RateLimiter';
import { CircuitBreaker } from '../circuitBreaker/CircuitBreaker';
import { Semaphore } from '../semaphore/Semaphore';
import { LoggingAdapter } from '../adapters/LoggingAdapter';
import { TelemetryAdapter } from '../adapters/TelemetryAdapter';

export class ClientSDK {
    private rateLimiter: RateLimiter;
    private circuitBreaker: CircuitBreaker;
    private semaphore: Semaphore;
    private loggingAdapter: LoggingAdapter;
    private telemetryAdapter: TelemetryAdapter;

    constructor(
        rateLimiter: RateLimiter,
        circuitBreaker: CircuitBreaker,
        semaphore: Semaphore,
        loggingAdapter: LoggingAdapter,
        telemetryAdapter: TelemetryAdapter
    ) {
        this.rateLimiter = rateLimiter;
        this.circuitBreaker = circuitBreaker;
        this.semaphore = semaphore;
        this.loggingAdapter = loggingAdapter;
        this.telemetryAdapter = telemetryAdapter;
    }

    hitRateLimiter(clientId: string): boolean {
        return this.rateLimiter.hit(clientId);
    }

    checkRateLimiter(clientId: string): boolean {
        return this.rateLimiter.check(clientId);
    }

    callCircuitBreaker(func: Function, ...args: any[]): any {
        return this.circuitBreaker.call(func, ...args);
    }

    acquireSemaphore(): boolean {
        return this.semaphore.acquire();
    }

    releaseSemaphore(): void {
        this.semaphore.release();
    }
}
