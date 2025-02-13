import { CircuitBreakerFactory } from './circuitBreaker/CircuitBreaker';
import {ErrorPercentageCircuitBreakerOptions} from './circuitBreaker/CircuitBreakerOptions';
import axios from 'axios';

//circuit breaker options
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
const circuitBreaker = CircuitBreakerFactory.create(errorPercentageOptions

);

async function makeRequest() {
    try {
        await circuitBreaker.execute(async () => {
            const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1');
            console.log(response.data);
        });
    } catch (error) {
        const er = error as Error;
        console.error('Request failed:', er.message);
    }
}

makeRequest();
