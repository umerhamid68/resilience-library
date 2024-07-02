import { LoggingAdapter } from '../adapters/LoggingAdapter';
import { TelemetryAdapter } from '../adapters/TelemetryAdapter';

export class Semaphore {
    constructor(maxConcurrent: number, loggingAdapter: LoggingAdapter, telemetryAdapter: TelemetryAdapter) {
    }

    acquire(): boolean {
        return false;
    }

    release(): void {
    }
}
