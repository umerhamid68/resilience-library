import { RateLimiter } from './RateLimiter';
import { TokenBucketOptions } from './rateLimiter/RateLimitingStrategyOptions';
import { CircuitBreakerFactory } from './circuitBreaker/CircuitBreaker';
import {ErrorPercentageCircuitBreakerOptions} from './circuitBreaker/CircuitBreakerOptions';
import { Semaphore } from './Semaphore';
import { Policy } from './Policy';
import axios from 'axios';

const tokenBucketOptions: TokenBucketOptions = {
    type: 'token_bucket',
    maxTokens: 10,
    refillRate: 1,
    key: 'api/endpoint'
};

const rateLimiter = RateLimiter.create(tokenBucketOptions);

const errorPercentageOptions: ErrorPercentageCircuitBreakerOptions = {
    resourceName: 'ResourceService',
    rollingWindowSize: 10000,
    requestVolumeThreshold: 10,
    errorThresholdPercentage: 50,
    sleepWindow: 3000,
    fallbackMethod: () => 'Fallback response',
    pingService: async () => {
        const isServiceOperational = Math.random() < 0.8; //80% chance of service being operational
        return isServiceOperational;
    }
};

const circuitBreaker = CircuitBreakerFactory.create(errorPercentageOptions);

const semaphore = Semaphore.create('resource_key',3);

const policy = Policy.wrap(semaphore, rateLimiter, circuitBreaker);

async function makeRequest() {
    try {
        await policy.execute(async () => {
            const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1');
            console.log(response.data);
        });
    } catch (error) {
        const er = error as Error;
        console.error('Request failed:', er.message);
    }
}

makeRequest();
