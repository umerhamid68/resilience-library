import { LoggingAdapter } from '../adapters/LoggingAdapter';
import { TelemetryAdapter } from '../adapters/TelemetryAdapter';

export class CircuitBreaker {
    constructor(
        failureThreshold: number,
        recoveryTimeout: number,
        checkFunction: Function,
        loggingAdapter: LoggingAdapter,
        telemetryAdapter: TelemetryAdapter
    ) {
        
    }

    call(func: Function, ...args: any[]): any {
        return null;
    }
}
