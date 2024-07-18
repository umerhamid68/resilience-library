import { RateLimiter } from './RateLimiter';
import { Semaphore } from './Semaphore';
import { Policy } from './Policy';
import { TokenBucketOptions,FixedWindowCounterOptions,LeakyBucketOptions } from './rateLimiter/RateLimitingStrategyOptions';


// const fixedWindowRateLimiter = RateLimiter.create('fixed_window', {
//     maxRequests: 5,
//     windowSizeInMillis: 60000,
//     dbPath: './rateLimiterDB/fixed_window',
//     key: 'api/fixed_window_endpoint'
// });

const fixedWindowCounterOptions: FixedWindowCounterOptions = {
    type: 'fixed_window',
    maxRequests: 10,
    key: 'api/endpoint'
};
const fixedWindowRateLimiter = RateLimiter.create(fixedWindowCounterOptions);



const tokenBucketOptions: TokenBucketOptions = {
    type: 'token_bucket',
    maxTokens: 10,
    key: 'api/endpoint'
};
const tokenBucketRateLimiter = RateLimiter.create(tokenBucketOptions);


const leakyBucketOptions: LeakyBucketOptions = {
    type: 'leaky_bucket',
    maxRequests: 10,
    key: 'api/endpoint'
};
const leakyBucketRateLimiter = RateLimiter.create(leakyBucketOptions);

/*const f1 = RateLimiter.create('token_bucket', {
    key: 'a1',
    dbPath: './test1',
    refillRate: 1,
    maxTokens: 10
});*/

// const leakyBucketRateLimiter = RateLimiter.create('leaky_bucket', {
//     maxRequests: 10,
//     resetThresholdInMillis: 3600000,
//     dbPath: './rateLimiterDB/leaky_bucket',
//     key: 'api/leaky_bucket_endpoint'
// });

// const tokenBucketRateLimiter = RateLimiter.create('token_bucket', {
//     maxTokens: 10,
//     refillRate: 1,
//     dbPath: './rateLimiterDB/token_bucket',
//     key: 'api/token_bucket_endpoint'
// });

//function to handle request
async function handleRequest(rateLimiter: RateLimiter, clientId: string) {
    try {
        await rateLimiter.execute(async ({ signal }) => {
            console.log(`Service call executed for ${clientId}`);
        }, new AbortController().signal);
    } catch (error) {
        console.error(`Request failed for ${clientId}:`, error);
    }
}

async function testRateLimiters() {
    const clientId = 'testClient';

    /*console.log('Testing Fixed Window Rate Limiter:');
    for (let i = 0; i < 10; i++) {
        await handleRequest(fixedWindowRateLimiter, `${clientId}_fixed_window_${i}`);
    }*/

    /*console.log('Testing Leaky Bucket Rate Limiter:');
    for (let i = 0; i < 15; i++) {
        await handleRequest(leakyBucketRateLimiter, `${clientId}_leaky_bucket_${i}`);
    }*/

    console.log('Testing Token Bucket Rate Limiter:');
    for (let i = 0; i < 12; i++) {
        await handleRequest(tokenBucketRateLimiter, `${clientId}_token_bucket_${i}`);
    }
}
testRateLimiters().catch(error => {
    console.error('Unexpected error in test:', error);
});
