/////////////////////////////////////////updated logging and telemetry
import express from 'express';
import { RateLimiter } from './RateLimiter';
import { CircuitBreakerFactory, CircuitBreakerState } from './circuitBreaker/CircuitBreaker';
import { Semaphore } from './Semaphore';
import { Policy, IPolicyContext } from './Policy';
import { DefaultLoggingAdapter, LoggingAdapter } from './adapters/LoggingAdapter';
import { DefaultTelemetryAdapter, TelemetryAdapter } from './adapters/TelemetryAdapter';
import { ErrorPercentageCircuitBreakerOptions } from './circuitBreaker/CircuitBreakerOptions';
import { TokenBucketOptions } from './rateLimiter/RateLimitingStrategyOptions';

const app = express();
const port = 3001;
const loggingAdapter: LoggingAdapter = new DefaultLoggingAdapter();
const telemetryAdapter: TelemetryAdapter = new DefaultTelemetryAdapter();

// Initialize rate limiter
// const rateLimiter = RateLimiter.create('token_bucket', {
//     maxTokens: 10,
//     refillRate: 1,
//     dbPath: './rateLimiterDB',
//     key: 'api/endpoint'
// });


const tokenBucketOptions: TokenBucketOptions = {
    type: 'token_bucket',
    maxTokens: 10,
    key: 'api/endpoint'
};
const rateLimiter = RateLimiter.create(tokenBucketOptions);

const errorPercentageOptions: ErrorPercentageCircuitBreakerOptions = {
    resourceName: 'ResourceService',
    rollingWindowSize: 10000,
    requestVolumeThreshold: 10,
    errorThresholdPercentage: 50,
    sleepWindow: 3000,
    fallbackMethod: () => 'Fallback response',
    pingService: async () => {
        const isServiceOperational = Math.random() < 0.8; // 80% chance of service being operational
        return isServiceOperational;
    }
};
const circuitBreaker = CircuitBreakerFactory.create(errorPercentageOptions);
const semaphore = Semaphore.create('resource_key',3);

const policy = Policy.wrap(rateLimiter, semaphore, circuitBreaker);

policy.beforeExecute = async (context: IPolicyContext) => {
    loggingAdapter.log('Before execution');
    telemetryAdapter.collect({ event: 'before_execution' });
};

policy.afterExecute = async (context: IPolicyContext) => {
    loggingAdapter.log('After execution');
    telemetryAdapter.collect({ event: 'after_execution' });
};

app.get('/', (req, res) => {
    res.send('Welcome to the Rate Limiter, Circuit Breaker, and Semaphore Service!');
});

//test endpoint: http://localhost:3001/test?clientId=test
app.get('/test', async (req, res) => {
    const clientId = req.query.clientId as string;
    if (!clientId) {
        return res.status(400).send('clientId is required');
    }

    try {
        await policy.execute(async ({ signal }) => {
            // Simulate a service call
            console.log('Service call executed');
            res.send('Request processed successfully.');
        });
    } catch (error) {
        const er = error as Error;
        res.status(429).send(`Request failed: ${er.message}`);
    }
});

app.get('/hit', async (req, res) => {
    const clientId = req.query.clientId as string;
    if (!clientId) {
        return res.status(400).send('clientId is required');
    }

    try {
        if (await rateLimiter.hit(clientId)) {
            res.send('Rate limit check passed. Processing request...');
        } else {
            res.status(429).send('Rate limit exceeded. Try again later.');
        }
    } catch (error) {
        const er = error as Error;
        res.status(500).send(er.message);
    }
});

app.get('/check', async (req, res) => {
    const clientId = req.query.clientId as string;
    if (!clientId) {
        return res.status(400).send('clientId is required');
    }

    try {
        const allowed = await rateLimiter.check(clientId);
        res.send(`Request allowed: ${allowed}`);
    } catch (error) {
        const er = error as Error;
        res.status(500).send(er.message);
    }
});

app.get('/semaphore/acquire', async (req, res) => {
    try {
        const acquired = await semaphore.acquire();
        if (acquired) {
            res.send('Resource acquired successfully.');
        } else {
            res.status(429).send('Resource limit reached. Cannot acquire.');
        }
    } catch (error) {
        const er = error as Error;
        res.status(500).send(er.message);
    }
});

app.get('/semaphore/release', async (req, res) => {
    try {
        await semaphore.release();
        res.send('Resource released successfully.');
    } catch (error) {
        const er = error as Error;
        res.status(500).send(er.message);
    }
});

app.listen(port, () => {
    console.log(`HTTP server running on port ${port}`);
});
