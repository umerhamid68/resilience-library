export interface TelemetryAdapter {
    collect(data: Record<string, any>): void;
}

export class DefaultTelemetryAdapter implements TelemetryAdapter {
    collect(data: Record<string, any>): void {
        console.log('Telemetry data collected:', JSON.stringify(data));
    }
}
