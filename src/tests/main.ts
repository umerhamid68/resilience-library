import { ClientSDK } from '../ClientSDK/ClientSDK';
import { createRateLimiter } from '../rateLimiter/RateLimiterFactory';
import { RateLimiter } from '../rateLimiter/RateLimiter';
import { CircuitBreaker,CircuitBreakerSingleton,CircuitBreakerOptions,CircuitBreakerState } from '../circuitBreaker/CircuitBreaker';
import { Semaphore } from '../semaphore/Semaphore';
import { DefaultLoggingAdapter, LoggingAdapter } from '../adapters/LoggingAdapter';
import { DefaultTelemetryAdapter, TelemetryAdapter } from '../adapters/TelemetryAdapter';

const loggingAdapter: LoggingAdapter = new DefaultLoggingAdapter();
const telemetryAdapter: TelemetryAdapter = new DefaultTelemetryAdapter();
//creating rate limiter 
const rateLimiterStrategy = createRateLimiter('leaky_bucket', {
    maxRequests: 10,
    dbPath: './rateLimiterDB',
    key: 'api/endpoint10',
    resetThresholdInMillis: 3600000,
    loggingAdapter,
    telemetryAdapter
});
const rateLimiter = new RateLimiter(rateLimiterStrategy, loggingAdapter, telemetryAdapter);

//circuit breaker options
const circuitBreakerOptions: CircuitBreakerOptions = {
    resourceName: 'ResourceService',
    rollingWindowSize: 60000,
    requestVolumeThreshold: 10,
    errorThresholdPercentage: 50,
    sleepWindow: 3000,
};
const circuitBreaker = CircuitBreakerSingleton.getInstance(circuitBreakerOptions, loggingAdapter, telemetryAdapter);

//semaphore
const semaphore = new Semaphore(2, './semaphoreDB', 'resource_key', loggingAdapter, telemetryAdapter);

const clientSDK = new ClientSDK(rateLimiter, circuitBreaker, semaphore, loggingAdapter, telemetryAdapter);

//simulated service calls
function failingServiceCall() {
    return new Promise((resolve, reject) => {
        reject(new Error('Service call failed'));
    });
}

function timeoutServiceCall() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const error = new Error('Too Many Requests');
            (error as any).status = 408; //status property attached to the error
            reject(error); //for HTTP 429 error
        }, 1000);
    });
}

function successfulServiceCall() {
    return new Promise((resolve) => {
        resolve('Service called successfully');
    });
}

//test functions
async function testFallbackMethod() {
    await circuitBreaker.setManualState(CircuitBreakerState.OPEN);
    try {
        const fallbackResult = await clientSDK.callCircuitBreaker(successfulServiceCall);
        console.log(`Fallback Result: ${fallbackResult}`);
    } catch (error) {
        console.error('Error during fallback method test:', error);
    }
}

async function testPingService() {
    await circuitBreaker.setManualState(CircuitBreakerState.OPEN);
    try {
        const pingResult = await clientSDK.callCircuitBreaker(successfulServiceCall);
        console.log(`Ping Result: ${pingResult}`);
    } catch (error) {
        console.error('Error during ping service test:', error);
    }
}

async function testServiceCall(serviceCall: () => Promise<any>) {
    try {
        const result = await clientSDK.callCircuitBreaker(serviceCall);
        console.log(`Success: ${result}`);
    } catch (error: any) {
        console.log(`Error: ${error.message}`);
    }
}

//semaphore test functions
async function testSemaphoreAcquire() {
    try {
        const acquired = await semaphore.acquire();
        if (acquired) {
            console.log('Semaphore acquired successfully.');
        } else {
            console.log('Semaphore limit reached. Cannot acquire.');
        }
    } catch (error) {
        console.error('Error during semaphore acquire:', error);
    }
}

async function testSemaphoreRelease() {
    try {
        await semaphore.release();
        console.log('Semaphore released successfully.');
    } catch (error) {
        console.error('Error during semaphore release:', error);
    }
}

//rate limiter test functions
async function testRateLimiterHit(clientId: string) {
    try {
        if (await clientSDK.hitRateLimiter(clientId)) {
            console.log('Rate limit check passed. Processing request...');
        } else {
            console.log('Rate limit exceeded. Try again later.');
        }
    } catch (error) {
        console.error('Error during rate limiter hit:', error);
    }
}

async function testRateLimiterCheck(clientId: string) {
    try {
        const allowed = await clientSDK.checkRateLimiter(clientId);
        console.log(`Request allowed: ${allowed}`);
    } catch (error) {
        console.error('Error during rate limiter check:', error);
    }
}

//main function
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

        //test fallback method
        console.log('Testing fallback method');
        await testFallbackMethod();

        //test ping service
        console.log('Testing ping service');
        await testPingService();

        //log current state from DB
        console.log('Current Circuit Breaker State:', await circuitBreaker.currentStateFromDB());

        //test semaphore acquire
        console.log('Testing semaphore acquire');
        await testSemaphoreAcquire();

        //test semaphore release
        console.log('Testing semaphore release');
        await testSemaphoreRelease();

        //test rate limiter hit
        console.log('Testing rate limiter hit');
        await testRateLimiterHit('testClient');

        //test rate limiter check
        console.log('Testing rate limiter check');
        await testRateLimiterCheck('testClient');

        console.log('Main function completed');
    } catch (error) {
        console.error('Unexpected error:', error);
    }
}
main().catch(error => {
    console.error('Unexpected error in main:', error);
});
