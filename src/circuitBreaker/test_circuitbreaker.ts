// import { ClientSDK } from '../ClientSDK/ClientSDK';
// import { RateLimiter } from '../RateLimiter';
// //import { createRateLimiter } from './rateLimiter/rateLimiterFactory';
// import { CircuitBreakerFactory, CircuitBreakerState } from './CircuitBreaker';
// import { Semaphore } from '../Semaphore';
// import { DefaultLoggingAdapter } from '../adapters/LoggingAdapter';
// import { DefaultTelemetryAdapter } from '../adapters/TelemetryAdapter';

// const loggingAdapter = new DefaultLoggingAdapter();
// const telemetryAdapter = new DefaultTelemetryAdapter();

// // Rate limiter using factory (mocked for simplicity)
// const rateLimiterStrategy = RateLimiter.create('token_bucket', {
//     maxTokens: 10,
//     refillRate: 1,
//     dbPath: './rateLimiterDB',
//     key: 'api/endpoint',
//     loggingAdapter,
//     telemetryAdapter
// });
// const rateLimiter = new RateLimiter(rateLimiterStrategy, loggingAdapter, telemetryAdapter);

// const semaphore = Semaphore.create(2, './testService','test', loggingAdapter, telemetryAdapter);

// const circuitBreaker = CircuitBreakerFactory.getInstance(
//     'ResourceService',
//     10000,  // rollingWindowSize
//     3000,   // sleepWindow
//     {
//         requestVolumeThreshold: 10,
//         errorThresholdPercentage: 50,
//         fallbackMethod: () => 'Fallback response',
//         pingService: async () => {
//             // Simulate ping logic where it returns true when the service is operational
//             const isServiceOperational = Math.random() < 0.8; // 80% chance of service being operational
//             return isServiceOperational;
//         }
//     }
// );

// const clientSDK = new ClientSDK(rateLimiter, circuitBreaker, semaphore, loggingAdapter, telemetryAdapter);

// // Simulated service call that always fails
// function failingServiceCall() {
//     return new Promise((resolve, reject) => {
//         const error = new Error('Service Unavailable');
//         (error as any).status = 503; // Attach a status property to the error
//         reject(error); // Simulate HTTP 429 error
//     });
// }

// // Simulated service call that always times out
// function timeoutServiceCall() {
//     return new Promise((resolve, reject) => {
//         setTimeout(() => {
//             const error = new Error('Too Many Requests');
//             (error as any).status = 408; // Attach a status property to the error
//             reject(error); // Simulate HTTP 429 error
//         },1000);
//     });
// }

// // Simulated service call that always succeeds
// function successfulServiceCall() {
//     return new Promise((resolve) => {
//         resolve('Service called successfully');
//     });
// }

// async function testFallbackMethod() {
//     await circuitBreaker.setManualState(CircuitBreakerState.OPEN); // Await the state change
//     try {
//         const fallbackResult = await clientSDK.callCircuitBreaker(successfulServiceCall);
//         console.log(`Fallback Result: ${fallbackResult}`);
//     } catch (error) {
//         console.error(error);
//     }
// }

// async function testPingService() {
//     await circuitBreaker.setManualState(CircuitBreakerState.OPEN); // Await the state change
//     try {
//         const pingResult = await clientSDK.callCircuitBreaker(successfulServiceCall);
//         console.log(`Result: ${pingResult}`);
//     } catch (error) {
//         console.error(error);
//     }
// }

// async function testServiceCall(serviceCall: () => Promise<any>) {
//     try {
//         const result = await clientSDK.callCircuitBreaker(serviceCall);
//         console.log(`Success: ${result}`);
//     } catch (error: any) {
//         console.log(`${error}`);
//     }
// }

// async function main() {
//     console.log('Starting main function');

// try {
//     // Test successful service calls
//     console.log('Testing successful service calls');
//     await testServiceCall(successfulServiceCall);

//     // Test failing service calls
//     console.log('Testing failing service calls');
//     await testServiceCall(failingServiceCall);

//     // Test timeout service calls
//     console.log('Testing timeout service calls');
//     await testServiceCall(timeoutServiceCall);

//     // Test fallback method
//     // console.log('Testing fallback method');
//     // await testFallbackMethod();

//     // Test ping service
//     console.log('Testing ping service');
//     await testPingService();
// } catch (error) {
//     console.error('Unexpected error:', error);
// }
// }

// main().catch(error => {
//     console.error('Unexpected error in main:', error);
// });


///////////////////////////////////////////////////new test through policy
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

const semaphore = Semaphore.create('test',3);

const errorPercentageOptions: ErrorPercentageCircuitBreakerOptions = {
    resourceName: 'ResourceService',
    rollingWindowSize: 10000,
    requestVolumeThreshold: 10,
    errorThresholdPercentage: 50,
    sleepWindow: 3000,
    fallbackMethod: () => 'Fallback response',
    pingService: async () => {
        const isServiceOperational = Math.random() < 0.8; // 80% chance of service being operational
        return isServiceOperational;
    }
};
const circuitBreaker = CircuitBreakerFactory.create(errorPercentageOptions);
//create a policy that wraps all the strategies
const policy = Policy.wrap(semaphore,rateLimiter,circuitBreaker);

//simulated service call that always fails
function failingServiceCall() {
    return new Promise((resolve, reject) => {
        const error = new Error('Service Unavailable');
        (error as any).status = 503;
        reject(error);
    });
}

//simulated service call that always times out
function timeoutServiceCall() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const error = new Error('Too Many Requests');
            (error as any).status = 408;
            reject(error);
        }, 1000);
    });
}

//simulated service call that always succeeds
function successfulServiceCall() {
    return new Promise((resolve) => {
        resolve('Service called successfully');
    });
}

async function testFallbackMethod() {
    await circuitBreaker.setManualState(CircuitBreakerState.OPEN);
    try {
        const fallbackResult = await policy.execute(successfulServiceCall);
        console.log(`Fallback Result: ${fallbackResult}`);
    } catch (error) {
        console.error(error);
    }
}

async function testPingService() {
    await circuitBreaker.setManualState(CircuitBreakerState.OPEN);
    try {
        const pingResult = await policy.execute(successfulServiceCall);
        console.log(`Result: ${pingResult}`);
    } catch (error) {
        console.error(error);
    }
}

async function testServiceCall(serviceCall: () => Promise<any>) {
    try {
        const result = await policy.execute(serviceCall);
        console.log(`Success: ${result}`);
    } catch (error: any) {
        console.log(`${error}`);
    }
}

async function main() {
    console.log('Starting main function');

    try {
        //test successful service calls
        console.log('Testing successful service calls');
        await testServiceCall(successfulServiceCall);

        //test failing service calls
        console.log('Testing failing service calls');
        await testServiceCall(failingServiceCall);

        //test timeout service calls
        console.log('Testing timeout service calls');
        await testServiceCall(timeoutServiceCall);

        //test ping service
        console.log('Testing ping service');
        await testPingService();
    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

main().catch(error => {
    console.error('Unexpected error in main:', error);
});
