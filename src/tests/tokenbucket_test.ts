// import { TokenBucketStrategy } from '../rateLimiter/TokenBucketStrategy';
// import { DefaultLoggingAdapter } from '../adapters/LoggingAdapter';
// import { DefaultTelemetryAdapter } from '../adapters/TelemetryAdapter';

// async function runTokenBucketTest() {
//     console.log('Starting Token Bucket Rate Limiter Test...');

//     const loggingAdapter = new DefaultLoggingAdapter();
//     const telemetryAdapter = new DefaultTelemetryAdapter();
//     const dbPath = './tokenBucketDB';
//     const key = 'api/endpoint';

//     const tokenBucket = new TokenBucketStrategy.TokenBucketStrategy(
//         10,//maxTokens
//         100,//per second
//         dbPath,
//         key
//     );

//     try {
//         // await tokenBucket['dbReady'];
//         // console.log('Database opened successfully.');
//         // console.log('here');
//         const firstCheck = await tokenBucket.check('testClienta');
//         console.log(`Final check: ${firstCheck ? 'Allowed' : 'Denied'}`);
//         for (let i = 1; i <= 15; i++) {
//             try {
//                 console.log('here 2');
//                 const allowed = await tokenBucket.hit(`testClient${i}`);
//                 console.log(`Hit attempt ${i}: ${allowed ? 'Allowed' : 'Denied'}`);
//             } catch (err) {
//                 console.error(`Error during hit attempt ${i}:`, err);
//             }
//         }
//     } catch (error) {
//         console.error('Error during rate limiter tests:', error);
//     }
//     const finalCheck = await tokenBucket.check('testClient');
//     console.log(`Final check: ${finalCheck ? 'Allowed' : 'Denied'}`);
// }

// runTokenBucketTest();
