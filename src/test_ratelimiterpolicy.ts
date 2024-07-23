import { RateLimiter } from './RateLimiter';
import { FixedWindowCounterOptions, LeakyBucketOptions, TokenBucketOptions } from './rateLimiter/RateLimitingStrategyOptions';
// import { CircuitBreaker } from './CircuitBreaker';
import { Semaphore } from './Semaphore';
//import {  } from './Policy';
import { IPolicyContext, Policy } from './Policy';
import { DefaultLoggingAdapter } from './adapters/LoggingAdapter';
import { DefaultTelemetryAdapter} from './adapters/TelemetryAdapter';

const loggingAdapter = new DefaultLoggingAdapter();
const telemetryAdapter = new DefaultTelemetryAdapter();

/*const rateLimiter = RateLimiter.create('token_bucket', {
    maxTokens: 10,
    refillRate: 1,
    dbPath: './rateLimiterDB',
    key: 'api/endpoint'
});*/

const tokenBucketOptions: TokenBucketOptions = {
    type: 'token_bucket',
    maxTokens: 10,  
    key: 'api/endpoint'
};

const leakyBucketOptions: LeakyBucketOptions = {
    type:'leaky_bucket',
    maxRequests:10,
    key:'api/endpoint'

}

const fixedWindowOptions:  FixedWindowCounterOptions = {
    type:'fixed_window',
    maxRequests:10,
    key:'api/endpoint'
}
const rateLimiter = RateLimiter.create(fixedWindowOptions);

/*const circuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    recoveryTimeout: 10000,
    loggingAdapter,
    telemetryAdapter
});*/



/*const semaphore = Semaphore.create('resource_key',3);*/

const policy = Policy.wrap(rateLimiter);

policy.beforeExecute = async (context: IPolicyContext) => {
    loggingAdapter.log('Before execution');
    telemetryAdapter.collect({ event: 'before_execution' });
};

policy.afterExecute = async (context: IPolicyContext) => {
    loggingAdapter.log('After execution');
    telemetryAdapter.collect({ event: 'after_execution' });
};

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
