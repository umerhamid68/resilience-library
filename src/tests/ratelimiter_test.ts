import { TokenBucketStrategy } from '../rateLimiter/TokenBucketStrategy';
import { FixedWindowCounterStrategy } from '../rateLimiter/FixedWindowCounter';
import { DefaultLoggingAdapter } from '../adapters/LoggingAdapter';
import { DefaultTelemetryAdapter } from '../adapters/TelemetryAdapter';

const loggingAdapter = new DefaultLoggingAdapter();
const telemetryAdapter = new DefaultTelemetryAdapter();

async function testTokenBucketRateLimiter() {
    console.log('Starting Token Bucket Rate Limiter Test...');

    const rateLimiter = new TokenBucketStrategy.TokenBucketStrategy(
        10,//max
        1,//per second
        './tokenBucketDB',
        'api/endpoint',
        loggingAdapter,
        telemetryAdapter
    );

    for (let i = 0; i < 12; i++) {
        try {
            const allowed = await rateLimiter.hit('testClient');
            console.log(`Hit attempt ${i + 1}: ${allowed ? 'Allowed' : 'Denied'}`);
        } catch (error) {
            console.error(`Error during hit attempt ${i + 1}:`, error);
        }
    }

    const finalCheck = await rateLimiter.check('testClient');
    console.log(`Final check: ${finalCheck ? 'Allowed' : 'Denied'}`);
}

async function testFixedWindowRateLimiter() {
    console.log('Starting Fixed Window Rate Limiter Test...');

    const rateLimiter = new FixedWindowCounterStrategy.FixedWindowCounterStrategy(
        5,//max
        60000,//1 min
        './fixedWindowDB',
        'api/endpoint',
        loggingAdapter,
        telemetryAdapter
    );

    for (let i = 0; i < 7; i++) {
        try {
            console.log('here');
            const allowed = await rateLimiter.hit('testClient');
            console.log('here2');
            console.log(`Hit attempt ${i + 1}: ${allowed ? 'Allowed' : 'Denied'}`);
        } catch (error) {
            console.error(`Error during hit attempt ${i + 1}:`, error);
        }
    }

    const finalCheck = await rateLimiter.check('testClient');
    console.log(`Final check: ${finalCheck ? 'Allowed' : 'Denied'}`);
}

async function runTests() {
    //await testTokenBucketRateLimiter();
    await testFixedWindowRateLimiter();
}

runTests().catch((err) => {
    console.error('Error during rate limiter tests:', err);
});
