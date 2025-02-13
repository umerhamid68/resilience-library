import { TokenBucketStrategy } from './rateLimiter/TokenBucketStrategy';
import { FixedWindowCounterStrategy } from './rateLimiter/FixedWindowCounter';
import { Semaphore } from './Semaphore';
import { DefaultLoggingAdapter } from './adapters/LoggingAdapter';
import { DefaultTelemetryAdapter } from './adapters/TelemetryAdapter';
import { Policy } from './Policy';
import { RateLimiter } from './RateLimiter';
import { TokenBucketOptions } from './rateLimiter/RateLimitingStrategyOptions';

const loggingAdapter = new DefaultLoggingAdapter();
const telemetryAdapter = new DefaultTelemetryAdapter();

async function testTokenBucketRateLimiter() {
    console.log('Starting Token Bucket Rate Limiter Test...');

    const tokenBucketOptions: TokenBucketOptions = {
        type: 'token_bucket',
        maxTokens: 10,
        key: 'api/endpoint'
    };
    const rateLimiter = RateLimiter.create(tokenBucketOptions);
    const rateLimiterPolicy = Policy.wrap(rateLimiter);

    for (let i = 0; i < 12; i++) {
        try {
            const allowed = await rateLimiterPolicy.execute(() => Promise.resolve(true));
            //const allowed = await rateLimiter.hit('testClient');
            console.log(`Hit attempt ${i + 1}: ${allowed ? 'Allowed' : 'Denied'}`);
        } catch (error) {
            const er = error as Error;
            console.error(`Error during hit attempt ${i + 1}:`, er.message);
        }
    }

    try {
        const finalCheck = await rateLimiter.check('testClient');
        console.log(`Final check: ${finalCheck ? 'Allowed' : 'Denied'}`);
    } catch (error) {
        const er = error as Error;
        console.error('Error during final check:', er.message);
    }
}

async function testSemaphore() {
    console.log('Starting Semaphore Test...');

    const semaphore = Semaphore.create('resource_key',3);
    //const semaphorePolicy = new Policy(semaphore);

    for (let i = 0; i < 5; i++) {
        try {
            //const acquired = await semaphorePolicy.execute(() => Promise.resolve(true));
            const acquired = await semaphore.acquire();
            console.log(`Acquire attempt ${i + 1}: ${acquired ? 'Success' : 'Failed'}`);
        } catch (error) {
            const er = error as Error;
            console.error(`Error during acquire attempt ${i + 1}:`, er.message);
        }
    }

    console.log('Releasing one resource...');
    try {
        await semaphore.release();
    } catch (error) {
        const er = error as Error;
        console.error('Error during release:', er.message);
    }

    try {
        //const acquiredAfterRelease = await semaphorePolicy.execute(() => Promise.resolve(true));
        const acquiredAfterRelease = await semaphore.acquire();
        console.log(`Acquire after release: ${acquiredAfterRelease ? 'Success' : 'Failed'}`);
    } catch (error) {
        const er = error as Error;
        console.error('Error during acquire after release:', er.message);
    }

    try {
        const finalCount = await semaphore['getResourceCount']();
        console.log(`Final resource count: ${finalCount}`);
    } catch (error) {
        const er = error as Error;
        console.error('Error during final resource count retrieval:', er.message);
    }
}


async function runTests() {
    await testTokenBucketRateLimiter();
    //await testFixedWindowRateLimiter();
    await testSemaphore();
}

runTests().catch((err) => {
    console.error('Error during rate limiter tests:', err.message);
});

