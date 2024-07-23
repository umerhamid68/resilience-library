import { RateLimiter } from './RateLimiter';
import { TokenBucketOptions } from './rateLimiter/RateLimitingStrategyOptions';
import { CircuitBreakerFactory } from './circuitBreaker/CircuitBreaker';
import { ErrorPercentageCircuitBreakerOptions, ExplicitThresholdCircuitBreakerOptions } from './circuitBreaker/CircuitBreakerOptions';
import { Semaphore } from './Semaphore';
import { IPolicyContext, Policy } from './Policy';
import axios from 'axios';


const tokenBucketOptions: TokenBucketOptions = {
    type: 'token_bucket',
    maxTokens: 10,
    refillRate: 1,
    key: 'api/endpoint'
};
const rateLimiter = RateLimiter.create(tokenBucketOptions);
/*const errorPercentageOptions: ErrorPercentageCircuitBreakerOptions = {
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
};*/
const explicitThresholdOptions: ExplicitThresholdCircuitBreakerOptions = {
    resourceName: 'ResourceService',
    rollingWindowSize: 10,
    failureThreshold: 5,
    timeoutThreshold: 2,
    successThreshold: 3,
    sleepWindow: 3000,
    fallbackMethod: () => 'Fallback response',
    pingService: async () => {
        const isServiceOperational = Math.random() < 0.8; //80% chance of service being operational
        return isServiceOperational;
    }
};
const circuitBreaker = CircuitBreakerFactory.create(explicitThresholdOptions);

//const circuitBreaker = CircuitBreakerFactory.create(errorPercentageOptions);
const semaphore = Semaphore.create('resource_key', 3);

const policy = Policy.wrap(semaphore, rateLimiter, circuitBreaker);

policy.beforeExecute = async (context: IPolicyContext) => {
    console.log('Before execution');
};

policy.afterExecute = async (context: IPolicyContext) => {
    console.log('After execution');
};

async function makeRequest() {
    try {
        await policy.execute(async () => {
            const response = await axios.get('http://localhost:3000/data');
            console.log('Response:', response.data);
        });
    } catch (error) {
        const er = error as Error;
        console.error('Request failed:', er.message);
    }
}

//send requests at regular intervals
async function startTesting() {
    while (true) {
        await makeRequest();
        await new Promise(resolve => setTimeout(resolve, 10000)); //10 second delay between requests
    }
}

startTesting();
