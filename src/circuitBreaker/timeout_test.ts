// import { RateLimiter } from '../RateLimiter';
// import { CircuitBreakerFactory, CircuitBreakerState } from './CircuitBreaker';
// import { Semaphore } from '../Semaphore';
// import { DefaultLoggingAdapter } from '../adapters/LoggingAdapter';
// import { DefaultTelemetryAdapter } from '../adapters/TelemetryAdapter';
// import { Policy, IPolicyContext } from '../Policy';
// import { ErrorPercentageCircuitBreakerOptions } from './CircuitBreakerOptions';
// import { TokenBucketOptions } from '../rateLimiter/RateLimitingStrategyOptions';

// const loggingAdapter = new DefaultLoggingAdapter();
// const telemetryAdapter = new DefaultTelemetryAdapter();

// const tokenBucketOptions: TokenBucketOptions = {
//     type: 'token_bucket',
//     key: 'api/endpoint',
//     maxTokens: 10
// };

// const rateLimiter = RateLimiter.create(tokenBucketOptions);

// const semaphore = Semaphore.create('test', 3);

// const errorPercentageOptions: ErrorPercentageCircuitBreakerOptions = {
//     resourceName: 'ResourceServiceB',
//     rollingWindowSize: 10000,
//     requestVolumeThreshold: 10,
//     errorThresholdPercentage: 50,
//     sleepWindow: 3000,
//     slowCallDurationThreshold: 2000, // 2 seconds
//     fallbackMethod: () => 'Fallback response',
//     pingService: async () => {
//         const isServiceOperational = Math.random() < 0.8; // 80% chance of service being operational
//         return isServiceOperational;
//     }
// };

// const circuitBreaker = CircuitBreakerFactory.create(errorPercentageOptions);
// const policy = Policy.wrap(semaphore, rateLimiter, circuitBreaker);

// // Simulated service call that always succeeds
// function successfulServiceCall() {
//     return new Promise((resolve) => {
//         setTimeout(() => {
//             resolve('Service called successfully');
//         }, 1000); // 1 second duration (below the threshold)
//     });
// }

// // Simulated service call that always times out
// function slowServiceCall() {
//     return new Promise((resolve) => {
//         setTimeout(() => {
//             resolve('Service call completed, but too slow');
//         }, 3000); // 3 seconds duration (above the threshold)
//     });
// }

// async function testServiceCall(serviceCall: () => Promise<any>) {
//     try {
//         const result = await policy.execute(serviceCall);
//         console.log(`Success: ${result}`);
//     } catch (error: any) {
//         console.error(`Failure: ${error.message}`);
//     }
// }

// async function main() {
//     console.log('Starting main function');

//     try {
//         // Test successful service call
//         console.log('Testing successful service call (should not timeout)');
//         await testServiceCall(successfulServiceCall);

//         // Test slow service call
//         console.log('Testing slow service call (should timeout)');
//         await testServiceCall(slowServiceCall);

//         // Test the state of the circuit breaker
//         /*const state = await circuitBreaker.currentStateFromDB();
//         const stats = await circuitBreaker.currentStatsFromDB();
//         console.log(`Circuit Breaker State: ${state}`);
//         console.log(`Circuit Breaker Stats:`, stats);*/
//     } catch (error) {
//         console.error('Unexpected error:', error);
//     }
// }

// main().catch(error => {
//     console.error('Unexpected error in main:', error);
// });




import { RateLimiter } from '../RateLimiter';
import { CircuitBreakerFactory, CircuitBreakerState } from './CircuitBreaker';
import { Semaphore } from '../Semaphore';
import { DefaultLoggingAdapter } from '../adapters/LoggingAdapter';
import { DefaultTelemetryAdapter } from '../adapters/TelemetryAdapter';
import { Policy, IPolicyContext } from '../Policy';
import { ErrorPercentageCircuitBreakerOptions } from './CircuitBreakerOptions';
import { TokenBucketOptions } from '../rateLimiter/RateLimitingStrategyOptions';

const loggingAdapter = new DefaultLoggingAdapter();
const telemetryAdapter = new DefaultTelemetryAdapter();

const tokenBucketOptions: TokenBucketOptions = {
    type: 'token_bucket',
    key: 'api/endpoint',
    maxTokens: 10
};

const rateLimiter = RateLimiter.create(tokenBucketOptions);

const semaphore = Semaphore.create('test', 3);

const errorPercentageOptions: ErrorPercentageCircuitBreakerOptions = {
    resourceName: 'ResourceServiceC',
    rollingWindowSize: 10000,
    requestVolumeThreshold: 10,
    errorThresholdPercentage: 50,
    sleepWindow: 3000,
    slowCallDurationThreshold: 2000, // 2 seconds
    fallbackMethod: () => 'Fallback response',
    pingService: async () => {
        const isServiceOperational = Math.random() < 0.8; // 80% chance of service being operational
        return isServiceOperational;
    }
};

const circuitBreaker = CircuitBreakerFactory.create(errorPercentageOptions);
const policy = Policy.wrap(semaphore, rateLimiter, circuitBreaker);

// Simulated service call that always succeeds
function successfulServiceCall() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve('Service called successfully');
        }, 1000); // 1 second duration (below the threshold)
    });
}

// Simulated service call that always times out
function slowServiceCall() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const error = new Error('Service call took too long');
            (error as any).status = 408;
            reject(error);
        }, 3000); // 3 seconds duration (above the threshold)
    });
}

async function testServiceCall(serviceCall: () => Promise<any>, callDescription: string) {
    console.log(`\n--- Testing ${callDescription} ---`);
    try {
        const result = await policy.execute(serviceCall);
        console.log(`Success: ${result}`);
    } catch (error: any) {
        console.error(`Failure: ${error.message}`);
    }
}

async function main() {
    console.log('Starting main function');

    try {
        // Test successful service call
        await testServiceCall(successfulServiceCall, 'successful service call (should not timeout)');

        // Test slow service call
        await testServiceCall(slowServiceCall, 'slow service call (should timeout)');

        // Test the state of the circuit breaker
        const state = await circuitBreaker.currentStateFromDB();
        const stats = await circuitBreaker.currentStatsFromDB();
        console.log(`\n--- Circuit Breaker State and Stats ---`);
        console.log(`Circuit Breaker State: ${state}`);
        console.log(`Circuit Breaker Stats:`, stats);
    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

main().catch(error => {
    console.error('Unexpected error in main:', error);
});
