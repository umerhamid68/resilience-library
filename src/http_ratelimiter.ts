import { error } from 'console';
import { RateLimiter } from './RateLimiter';
import { TokenBucketOptions } from './rateLimiter/RateLimitingStrategyOptions';
import axios from 'axios';

const tokenBucketOptions: TokenBucketOptions = {
    type: 'token_bucket',
    maxTokens: 10,
    refillRate: 1,
    key: 'api/endpoint'
};

const rateLimiter = RateLimiter.create(tokenBucketOptions);

async function makeRequest() {
    try {
        await rateLimiter.execute(async () => {
            const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1');
            console.log(response.data);
        });
    } catch (error) {
        const er = error as Error;
        console.error('Request failed:', er.message);
    }
}

makeRequest();
