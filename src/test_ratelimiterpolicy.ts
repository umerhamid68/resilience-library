import { RateLimiter } from './RateLimiter';
// import { CircuitBreaker } from './CircuitBreaker';
import { Semaphore } from './Semaphore';
import { wrap } from './Policy';
import { DefaultLoggingAdapter } from './adapters/LoggingAdapter';
import { DefaultTelemetryAdapter} from './adapters/TelemetryAdapter';

const loggingAdapter = new DefaultLoggingAdapter();
const telemetryAdapter = new DefaultTelemetryAdapter();

const rateLimiter = RateLimiter.create('token_bucket', {
    maxTokens: 10,
    refillRate: 1,
    dbPath: './rateLimiterDB',
    key: 'api/endpoint',
    loggingAdapter,
    telemetryAdapter
});

/*const circuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    recoveryTimeout: 10000,
    loggingAdapter,
    telemetryAdapter
});*/

const semaphore = Semaphore.create(3, './semaphoreDB', 'resource_key', loggingAdapter, telemetryAdapter);

const policy = wrap(semaphore,rateLimiter);

async function handleRequest() {
    try {
        await policy.execute(async ({ signal }) => {
            console.log('Service call executed');
        }, new AbortController().signal);
    } catch (error) {
        console.error('Request failed:', error);
    }
}

handleRequest();
