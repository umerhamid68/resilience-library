import express from 'express';
import { RateLimiter } from './RateLimiter';
//import { CircuitBreaker } from './CircuitBreaker';
import { Semaphore } from './Semaphore';
import { wrap, IPolicyContext } from './Policy';
import { DefaultLoggingAdapter, LoggingAdapter } from './adapters/LoggingAdapter';
import { DefaultTelemetryAdapter, TelemetryAdapter } from './adapters/TelemetryAdapter';

const app = express();
const port = 3001;
const loggingAdapter: LoggingAdapter = new DefaultLoggingAdapter();
const telemetryAdapter: TelemetryAdapter = new DefaultTelemetryAdapter();

// Initialize rate limiter
const rateLimiter = RateLimiter.create('token_bucket', {
    maxTokens: 10,
    refillRate: 1,
    dbPath: './rateLimiterDB',
    key: 'api/endpoint',
    loggingAdapter,
    telemetryAdapter
});

// Initialize circuit breaker
/*const circuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    recoveryTimeout: 10000,
    loggingAdapter,
    telemetryAdapter
});*/

// Initialize semaphore
const semaphore = Semaphore.create(3, './semaphoreDB', 'resource_key', loggingAdapter, telemetryAdapter);

// Create the composed policy
const policy = wrap(rateLimiter, semaphore);

// Express server setup
app.get('/', (req, res) => {
    res.send('Welcome to the Rate Limiter, Circuit Breaker, and Semaphore Service!');
});
////http://localhost:3001/test?clientId=test
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

// Endpoint to directly test rate limiter
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

// Endpoint to check rate limiter
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

// Endpoint to acquire semaphore
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

// Endpoint to release semaphore
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
