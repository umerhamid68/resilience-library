# resilience-library
## Overview
This library provides implementations for rate limiting and semaphore mechanisms to manage concurrency and rate control in your applications. It supports different rate limiting strategies like Token Bucket, Leaky Bucket, and Fixed Window Counter. You can also compose multiple policies such as rate limiters and semaphores to create more complex control mechanisms.

## Usage
### Creating a Rate Limiter
You can create a rate limiter using different strategies. Here is an example of creating a Token Bucket rate limiter.

```typescript
import { RateLimiter } from './RateLimiter';
import { DefaultLoggingAdapter } from './adapters/LoggingAdapter';
import { DefaultTelemetryAdapter } from './adapters/TelemetryAdapter';

const loggingAdapter = new DefaultLoggingAdapter();
const telemetryAdapter = new DefaultTelemetryAdapter();

const rateLimiter = RateLimiter.create('token_bucket', {
    maxTokens: 10,
    refillRate: 1,
    dbPath: './rateLimiterDB',
    key: 'api/endpoint',
    loggingAdapter,
    telemetryAdapter 
});
```
### Using Rate Limiter with Express Server
```typescript
import express from 'express';
import { RateLimiter } from './RateLimiter';
import { Semaphore } from './Semaphore';
import { DefaultLoggingAdapter } from './adapters/LoggingAdapter';
import { DefaultTelemetryAdapter } from './adapters/TelemetryAdapter';

const app = express();
const port = 3001;
const loggingAdapter = new DefaultLoggingAdapter();
const telemetryAdapter = new DefaultTelemetryAdapter();

const rateLimiter = RateLimiter.create('token_bucket', {
    maxTokens: 10,
    refillRate: 1,
    dbPath: './rateLimiterDB',
    key: 'api/endpoint',
    loggingAdapter,
    telemetryAdapter 
});

app.get('/', (req, res) => {
    res.send('Welcome to the Rate Limiter and Semaphore Service!');
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

app.listen(port, () => {
    console.log(`HTTP server running on port ${port}`);
});
```
Sample Request
```HTTP
http://localhost:3001/hit?clientId=testClient
```
### Creating a Semaphore
```typescript
import { Semaphore } from './Semaphore';
import { DefaultLoggingAdapter } from './adapters/LoggingAdapter';
import { DefaultTelemetryAdapter } from './adapters/TelemetryAdapter';

const loggingAdapter = new DefaultLoggingAdapter();
const telemetryAdapter = new DefaultTelemetryAdapter();

const semaphore = Semaphore.create(3, './semaphoreDB', 'resource_key', loggingAdapter, telemetryAdapter);
```
### Using Semaphore with Express Server
```typescript

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
```
### Composing Policies Using wrap Function
You can compose multiple policies such as rate limiters and semaphores to create a combined policy.

```typescript
import { RateLimiter } from './RateLimiter';
import { Semaphore } from './Semaphore';
import { wrap } from './Policy';
import { DefaultLoggingAdapter } from './adapters/LoggingAdapter';
import { DefaultTelemetryAdapter } from './adapters/TelemetryAdapter';

const loggingAdapter = new DefaultLoggingAdapter();
const telemetryAdapter = new DefaultTelemetryAdapter();

const rateLimiter = RateLimiter.create('token_bucket', {
    maxTokens: 10,
    refillRate: 1,
    dbPath: './rateLimiterDB',
    key: 'api/endpoint',
    loggingAdapter,
    telemetryAdapter
});

const semaphore = Semaphore.create(3, './semaphoreDB', 'resource_key', loggingAdapter, telemetryAdapter);

const policy = wrap(semaphore, rateLimiter);

async function handleRequest() {
    try {
        await policy.execute(async ({ signal }) => {
            console.log('Service call executed');
        }, new AbortController().signal);
    } catch (error) {
        console.error('Request failed:', error);
    }
}

handleRequest();
```

### Testing Composition of Policies through Express
```typescript
import express from 'express';
import { RateLimiter } from './RateLimiter';
import { Semaphore } from './Semaphore';
import { wrap } from './Policy';
import { DefaultLoggingAdapter, LoggingAdapter } from './adapters/LoggingAdapter';
import { DefaultTelemetryAdapter, TelemetryAdapter } from './adapters/TelemetryAdapter';

const app = express();
const port = 3001;
const loggingAdapter = new DefaultLoggingAdapter();
const telemetryAdapter = new DefaultTelemetryAdapter();

const rateLimiter = RateLimiter.create('token_bucket', {
    maxTokens: 10,
    refillRate: 1,
    dbPath: './rateLimiterDB',
    key: 'api/endpoint',
    loggingAdapter,
    telemetryAdapter
});

const semaphore = Semaphore.create(3, './semaphoreDB', 'resource_key', loggingAdapter, telemetryAdapter);

const policy = wrap(rateLimiter, semaphore);

app.get('/', (req, res) => {
    res.send('Welcome to the Rate Limiter and Semaphore Service!');
});

app.get('/test', async (req, res) => {
    const clientId = req.query.clientId as string;
    if (!clientId) {
        return res.status(400).send('clientId is required');
    }

    try {
        await policy.execute(async ({ signal }) => {
            console.log('Service call executed');
            res.send('Request processed successfully.');
        });
    } catch (error) {
        const er = error as Error;
        res.status(429).send(`Request failed: ${er.message}`);
    }
});

app.listen(port, () => {
    console.log(`HTTP server running on port ${port}`);
});
```
Sample HTTP Request
```http
http://localhost:3001/test?clientId=test
```
Sample Output
```plaintext
database opened.
Log: database open.
Log: Existing key detected. Deleting key: api/endpoint
Log: Key deleted: api/endpoint
here
Log: Existing key detected. Deleting key: resource_key
Log: Key deleted: resource_key
key not found in DB. starting new resource count.
--updated resource count in DB:: Key: resource_key, Count: 1
Log: resource acquired. Current count: 1
resource acquired. Current count: 1
Telemetry data collected: {"event":"resource_acquired","count":1}
Log: key not in DB. making new bucket state.
Log: -- updated state in DB:: key: api/endpoint, data: 10:1720755313051
Log: refilled 0 tokens (-0.001s), new token count: 10
Log: -- gotten state from DB:: key: api/endpoint, tokens: 10, last Refill: 1720755313051
Log: -- updated state in DB:: key: api/endpoint, data: 9:1720755313053
Log: Client defaultClientId hit successful. Tokens left: 9
Log: request_allowed for client: defaultClientId
Telemetry data collected: {"event":"request_allowed","clientId":"defaultClientId"}
Service call executed
--gotten resource count from DB:: Key: resource_key, Count: 1
--updated resource count in DB:: Key: resource_key, Count: 0
Log: resource released. Current count: 0
resource released. Current count: 0
Telemetry data collected: {"event":"resource_released","count":0}
```
