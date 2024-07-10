/////////////////////////////////////////////////leaky bucket
/*import express from 'express';
import { ClientSDK } from '../ClientSDK/ClientSDK';
import { createRateLimiter } from '../rateLimiter/RateLimiterFactory';
import { RateLimiter } from '../rateLimiter/RateLimiter';
import { CircuitBreaker } from '../circuitBreaker/CircuitBreaker';
import { Semaphore } from '../semaphore/Semaphore';
import { DefaultLoggingAdapter } from '../adapters/LoggingAdapter';
import { DefaultTelemetryAdapter } from '../adapters/TelemetryAdapter';

const app = express();
const port = 3001;
const loggingAdapter = new DefaultLoggingAdapter();
const telemetryAdapter = new DefaultTelemetryAdapter();
const rateLimiterStrategy = createRateLimiter('leaky_bucket', {
    maxRequests: 10,
    dbPath: './rateLimiterDB',
    key: 'api/endpoint7',
    loggingAdapter,
    telemetryAdapter
});

const rateLimiter = new RateLimiter(rateLimiterStrategy, loggingAdapter, telemetryAdapter);
const circuitBreaker = new CircuitBreaker(5, 60000, () => true, loggingAdapter, telemetryAdapter);
const semaphore = new Semaphore(3, './semaphoreDB', 'resource_key', loggingAdapter, telemetryAdapter);
const clientSDK = new ClientSDK(rateLimiter, circuitBreaker, semaphore, loggingAdapter, telemetryAdapter);

app.get('/', (req, res) => {
    res.send('Welcome to the Rate Limiter and Semaphore Service!');
});

app.get('/hit', async (req, res) => {
    const clientId = req.query.clientId as string;
    if (!clientId) {
        return res.status(400).send('clientId is required');
    }

    try {
        if (await clientSDK.hitRateLimiter(clientId)) {
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
        const allowed = await clientSDK.checkRateLimiter(clientId);
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
*/