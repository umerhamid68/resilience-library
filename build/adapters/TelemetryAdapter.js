"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultTelemetryAdapter = void 0;
class DefaultTelemetryAdapter {
    collect(data) {
        console.log('Telemetry data collected:', JSON.stringify(data));
    }
}
exports.DefaultTelemetryAdapter = DefaultTelemetryAdapter;
