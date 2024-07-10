import { TokenBucketStrategy } from '../rateLimiter/TokenBucketStrategy';
import { DefaultLoggingAdapter } from '../adapters/LoggingAdapter';
import { DefaultTelemetryAdapter } from '../adapters/TelemetryAdapter';

async function runTokenBucketTest() {
    console.log('Starting Token Bucket Rate Limiter Test...');

    const loggingAdapter = new DefaultLoggingAdapter();
    const telemetryAdapter = new DefaultTelemetryAdapter();
    const dbPath = './tokenBucketDB';
    const key = 'api/endpoint';

    const tokenBucket = new TokenBucketStrategy.TokenBucketStrategy(
        10,//maxTokens
        1,//per second
        dbPath,
        key,
        3600000,  
        loggingAdapter,
        telemetryAdapter
    );

    try {
        // await tokenBucket['dbReady'];
        // console.log('Database opened successfully.');
        // console.log('here');
        for (let i = 1; i <= 15; i++) {
            try {
                console.log('here 2');
                const allowed = await tokenBucket.hit(`testClient${i}`);
                console.log(`Hit attempt ${i}: ${allowed ? 'Allowed' : 'Denied'}`);
            } catch (err) {
                console.error(`Error during hit attempt ${i}:`, err);
            }
        }
    } catch (error) {
        console.error('Error during rate limiter tests:', error);
    }
}

runTokenBucketTest();
