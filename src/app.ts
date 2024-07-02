import { ClientSDK } from './ClientSDK/ClientSDK';
import { RateLimiter } from './rateLimiter/RateLimiter';
import { RateLimiterFactory,createRateLimiter } from './rateLimiter/RateLimiterFactory';
import { CircuitBreaker } from './circuitBreaker/CircuitBreaker';
import { Semaphore } from './semaphore/Semaphore';
import { LoggingAdapter } from './adapters/LoggingAdapter';
import { TelemetryAdapter } from './adapters/TelemetryAdapter';

const loggingAdapter = new LoggingAdapter();
const telemetryAdapter = new TelemetryAdapter();

//ratelimiter using factory
const rateLimiterStrategy = createRateLimiter('sliding_window', {
    maxRequests: 10,
    windowSize: 60,
    segmentSize: 10,
    dbPath: './rateLimiterDB'
});
const rateLimiter = new RateLimiter(rateLimiterStrategy, loggingAdapter, telemetryAdapter);
const circuitBreaker = new CircuitBreaker(5, 60000, () => true, loggingAdapter, telemetryAdapter);
const semaphore = new Semaphore(3, loggingAdapter, telemetryAdapter);
const clientSDK = new ClientSDK(rateLimiter, circuitBreaker, semaphore, loggingAdapter, telemetryAdapter);

//example function to call with circuitbraker
function exampleServiceCall() {
    console.log('Service called successfully');
}

function main() {
    const clientId = 'client_123';

    if (clientSDK.hitRateLimiter(clientId)) {
        console.log('Rate limit check passed.');
    } else {
        console.log('Rate limit exceeded.');
    }

    try {
        clientSDK.callCircuitBreaker(exampleServiceCall);
    } catch (error) {
        console.log('Circuit breaker is open.');
    }

    if (clientSDK.acquireSemaphore()) {
        try {
            console.log('Semaphore acquired.');
        } finally {
            clientSDK.releaseSemaphore();
            console.log('Semaphore released.');
        }
    } else {
        console.log('Semaphore acquisition failed.');
    }
}

main();
