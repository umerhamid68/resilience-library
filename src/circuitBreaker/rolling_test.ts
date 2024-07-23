import { RateLimiter } from '../RateLimiter';
import { CircuitBreakerFactory, CircuitBreakerState } from './CircuitBreaker';
import { Semaphore } from '../Semaphore';
import { DefaultLoggingAdapter } from '../adapters/LoggingAdapter';
import { DefaultTelemetryAdapter } from '../adapters/TelemetryAdapter';
import { Policy, IPolicyContext } from '../Policy';
import { ErrorPercentageCircuitBreakerOptions } from './CircuitBreakerOptions';

const loggingAdapter = new DefaultLoggingAdapter();
const telemetryAdapter = new DefaultTelemetryAdapter();

const errorPercentageOptions: ErrorPercentageCircuitBreakerOptions = {
    resourceName: 'ResourceServiceTest123',
    rollingWindowSize: 10, // 10 seconds
    requestVolumeThreshold: 10,
    errorThresholdPercentage: 50,
    sleepWindow: 3000,
    fallbackMethod: () => 'Fallback response',
    pingService: async () => true // Assume service is always operational for this test
};

const circuitBreaker = CircuitBreakerFactory.create(errorPercentageOptions);

const policy = Policy.wrap(circuitBreaker);

function failingServiceCall() {
    return new Promise((resolve, reject) => {
        const error = new Error('Service Unavailable');
        (error as any).status = 503;
        reject(error);
    });
}

function successfulServiceCall() {
    return new Promise((resolve) => {
        resolve('Service called successfully');
    });
}

async function monitorStats() {
    const stats = await circuitBreaker.calculateAggregates();
    console.log('Current Stats:', stats);
}

async function main() {
    console.log('Starting main function');
    //await circuitBreaker.setManualState(CircuitBreakerState.CLOSED);

    try {
        console.log('Sending first request (failure)');
        await policy.execute(successfulServiceCall);
        await monitorStats();

        console.log('Waiting 1 second...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('Sending second request (success)');
        await policy.execute(successfulServiceCall);
        await monitorStats();

        console.log('Waiting 1 second...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('Sending third request (failure)');
        await policy.execute(successfulServiceCall);
        await monitorStats();

        console.log('Waiting 1 second...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('Sending fourth request (success)');
        await policy.execute(successfulServiceCall);
        await monitorStats();

        console.log('Monitoring stats for the next 10 seconds...');
        for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            await monitorStats();
        }

    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

main().catch(error => {
    console.error('Unexpected error in main:', error);
});
