import { LeakyBucketStrategy } from '../rateLimiter/LeakyBucketStrategy';
import { DefaultLoggingAdapter } from '../adapters/LoggingAdapter';
import { DefaultTelemetryAdapter } from '../adapters/TelemetryAdapter';

async function runLeakyBucketTest() {
    console.log('Starting Leaky Bucket Rate Limiter Test...');

    const loggingAdapter = new DefaultLoggingAdapter();
    const telemetryAdapter = new DefaultTelemetryAdapter();
    const dbPath = './leakyBucketDB';
    const key = 'api/endpoint7';

    const leakyBucket = new LeakyBucketStrategy.LeakyBucketStrategy(
        10,//maxRequests
        dbPath,
        key,
        10000,
        loggingAdapter,
        telemetryAdapter
    );

    try {
        // Give some time for the database to be ready
        //await leakyBucket['dbReady'];
        console.log('Database opened successfully.');

        for (let i = 1; i <= 15; i++) {
            try {
                const allowed = await leakyBucket.hit(`testClient${i}`);
                console.log(`Hit attempt ${i}: ${allowed ? 'Allowed' : 'Denied'}`);
            } catch (err) {
                console.error(`Error during hit attempt ${i}:`, err);
            }
        }
    } catch (error) {
        console.error('Error during rate limiter tests:', error);
    }
    const finalCheck = await leakyBucket.check('testClient');
    console.log(`Final check: ${finalCheck ? 'Allowed' : 'Denied'}`);
}

runLeakyBucketTest();
