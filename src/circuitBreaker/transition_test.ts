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

// /*const tokenBucketOptions: TokenBucketOptions = {
//     type: 'token_bucket',
//     key: 'api/endpoint',
//     maxTokens: 10,
//     refillRate: 1
// };

// const rateLimiter = RateLimiter.create(tokenBucketOptions);

// const semaphore = Semaphore.create('test', 3);
// */
// const errorPercentageOptions: ErrorPercentageCircuitBreakerOptions = {
//     resourceName: 'ResourceService111',
//     rollingWindowSize: 10000, //10 seconds
//     requestVolumeThreshold: 10,
//     errorThresholdPercentage: 50,
//     sleepWindow: 3000,
//     fallbackMethod: () => 'Fallback response',
//     pingService: async () => {
//         return true; //Assume service is always operational for this test
//     }
// };

// const circuitBreaker = CircuitBreakerFactory.create(errorPercentageOptions);

// const policy = Policy.wrap(circuitBreaker);

// function failingServiceCall() {
//     return new Promise((resolve, reject) => {
//         const error = new Error('Service Unavailable');
//         (error as any).status = 503;
//         reject(error);
//     });
// }

// function successfulServiceCall() {
//     return new Promise((resolve) => {
//         resolve('Service called successfully');
//     });
// }

// async function testServiceCall(serviceCall: () => Promise<any>, count: number) {
//     for (let i = 0; i < count; i++) {
//         try {
//             const result = await policy.execute(serviceCall);
//             console.log(`Success: ${result}`);
//         } catch (error: any) {
//             console.log(`Error: ${error.message}`);
//         }
//     }
// }

// async function main() {
//     console.log('Starting main function');

//     try {
        
//         //await circuitBreaker.setManualState(CircuitBreakerState.CLOSED);
//         console.log('Testing failing service calls to reach error threshold');
//         await testServiceCall(failingServiceCall, 15); //15 calls to ensure error threshold is reached

//         console.log('Current State after failing calls:', await circuitBreaker.currentStateFromDB());

//         //state transition after successful calls
//         //console.log('Current State after successful calls:', await circuitBreaker.currentStateFromDB());

//         //console.log('Testing ping service');
//         //await testServiceCall(successfulServiceCall, 1);
        
//         await testServiceCall(successfulServiceCall, 5);
//         console.log('Current State after successful calls:', await circuitBreaker.currentStateFromDB());
//         console.log('Final State after ping service:', await circuitBreaker.currentStateFromDB());
//         console.log('Aggregate stats: ', await circuitBreaker.currentStatsFromDB());
//     } catch (error) {
//         console.error('Unexpected error:', error);
//     }
// }

// main().catch(error => {
//     console.error('Unexpected error in main:', error);
// });



////////////////////////////////////////particular test:


// import { CircuitBreakerFactory, CircuitBreakerState } from './CircuitBreaker';
// import { Policy, IPolicyContext } from '../Policy';
// import { ErrorPercentageCircuitBreakerOptions } from './CircuitBreakerOptions';

// const errorPercentageOptions: ErrorPercentageCircuitBreakerOptions = {
//     resourceName: 'ResourceServiceTest1a',
//     rollingWindowSize: 10, // 10 seconds
//     requestVolumeThreshold: 10,
//     errorThresholdPercentage: 50,
//     sleepWindow: 3000,
//     fallbackMethod: () => 'Fallback response',
//     pingService: async () => true // Assume service is always operational for this test
// };

// const circuitBreaker = CircuitBreakerFactory.create(errorPercentageOptions);

// const policy = Policy.wrap(circuitBreaker);

// function failingServiceCall() {
//     return new Promise((resolve, reject) => {
//         const error = new Error('Service Unavailable');
//         //(error as any).status = 503;
//         reject(error);
//     });
// }

// function successfulServiceCall() {
//     return new Promise((resolve) => {
//         resolve('Service called successfully');
//     });
// }

// async function testServiceCall(serviceCall: () => Promise<any>, count: number) {
//     for (let i = 0; i < count; i++) {
//         try {
//             const result = await policy.execute(serviceCall);
//             console.log(`Success: ${result}`);
//         } catch (error: any) {
//             console.log(`Error: ${error.message}`);
//         }
//     }
// }

// async function monitorStats() {
//     const stats = await circuitBreaker.calculateAggregates();
//     console.log('Current Stats:', stats);
// }

// async function main() {
//     console.log('Starting main function');

//     // try {
//         console.log('Sending 4 failing requests simultaneously');
        
//         await policy.execute(failingServiceCall);
//         await policy.execute(failingServiceCall);
//         await policy.execute(failingServiceCall);
//         await policy.execute(failingServiceCall);
        

//         await monitorStats();

//         console.log('Waiting 6 seconds...');
//         await new Promise(resolve => setTimeout(resolve, 6000));

//         console.log('Sending a failing request at the 9th second');
//         await policy.execute(failingServiceCall);
//         await monitorStats();

//         console.log('Waiting for the circuit breaker to transition to OPEN state and then to HALF_OPEN state...');
//         await new Promise(resolve => setTimeout(resolve, errorPercentageOptions.sleepWindow + 1000));

//         await monitorStats();
//         console.log('Current State after failing request:', await circuitBreaker.currentStateFromDB());

//         console.log('Sending successful requests to transition to CLOSED state');
//         await testServiceCall(successfulServiceCall, 6);
//         await monitorStats();

//         console.log('Final State:', await circuitBreaker.currentStateFromDB());
//     // } catch (error) {
//     //     console.error('Unexpected error:', error);
//     // }
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

const loggingAdapter = new DefaultLoggingAdapter();
const telemetryAdapter = new DefaultTelemetryAdapter();

const errorPercentageOptions: ErrorPercentageCircuitBreakerOptions = {
    resourceName: 'ResourceServiceTest1b',
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

async function testServiceCall(serviceCall: () => Promise<any>, count: number) {
    const promises = [];
    for (let i = 0; i < count; i++) {
        promises.push(
            policy.execute(serviceCall)
                .then(result => console.log(`Success: ${result}`))
                .catch(error => console.log(`Error: ${error.message}`))
        );
    }
    await Promise.all(promises);
}

async function main() {
    console.log('Starting main function');

    try {
        console.log('Sending 4 failing requests simultaneously');
        await testServiceCall(failingServiceCall, 4);

        console.log('Waiting 7 seconds...');
        await new Promise(resolve => setTimeout(resolve, 7000));

        console.log('Sending 1 failing request to trigger OPEN state');
        await testServiceCall(failingServiceCall, 1);

        console.log('Current State after failing calls:', await circuitBreaker.currentStateFromDB());

        console.log('Waiting for ping service...');
        await new Promise(resolve => setTimeout(resolve, errorPercentageOptions.sleepWindow + 1000));

        console.log('Sending 5 successful requests to transition to CLOSED state');
        await testServiceCall(successfulServiceCall, 5);

        console.log('Current State after successful calls:', await circuitBreaker.currentStateFromDB());
        console.log('Final State after ping service:', await circuitBreaker.currentStateFromDB());
        console.log('Aggregate stats: ', await circuitBreaker.calculateAggregates());
    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

main().catch(error => {
    console.error('Unexpected error in main:', error);
});










