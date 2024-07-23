// import { error } from 'console';
// import { RateLimiter } from './RateLimiter';
// import { TokenBucketOptions } from './rateLimiter/RateLimitingStrategyOptions';
// import {Policy} from './Policy';
// import axios from 'axios';

// const tokenBucketOptions: TokenBucketOptions = {
//     type: 'token_bucket',
//     maxTokens: 10,
//     refillRate: 1,
//     key: 'api/endpoint'
// };

// const rateLimiter = RateLimiter.create(tokenBucketOptions);
// const policy = Policy.wrap(rateLimiter);
// //policy.rateLimiter.??
// async function makeRequest() {
//     try {
//         await rateLimiter.execute(async () => {
//             const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1');
//             console.log(response.data);
//         });
//     } catch (error) {
//         const er = error as Error;
//         console.error('Request failed:', er.message);
//     }
// }

// makeRequest();















import { error } from 'console';
import { RateLimiter } from './RateLimiter';
import { TokenBucketOptions } from './rateLimiter/RateLimitingStrategyOptions';
import {IPolicyContext, Policy} from './Policy';
import axios from 'axios';
import { Semaphore } from './Semaphore';

const tokenBucketOptions: TokenBucketOptions = {
    type: 'token_bucket',
    maxTokens: 10,
    refillRate: 1,
    key: 'api/endpoint'
};

const rateLimiter = RateLimiter.create(tokenBucketOptions);
const semaphore = Semaphore.create('resource_key',3);

const policy = Policy.wrap(semaphore,rateLimiter);

if (policy.rateLimiter) {
    policy.rateLimiter.beforeExecut = async (context: IPolicyContext) => {
        console.log('Before execution');
    };
}
if (policy.semaphore) {
    policy.semaphore.beforeExecute = async (context: IPolicyContext) => {
        console.log('Before execution2');
    };
}

async function makeRequest() {
    try {
        await policy.execute(async () => { ///can access individual object through policy object
            const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1');
            console.log(response.data);
        });
    } catch (error) {
        const er = error as Error;
        console.error('Request failed:', er.message);
    }
}

makeRequest();
