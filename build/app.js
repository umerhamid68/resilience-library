"use strict";
//////////////////////////////////////////////////////////using correct db implementation of token bucket
/*import express from 'express';
import { ClientSDK } from './ClientSDK/ClientSDK';
import { createRateLimiter } from './rateLimiter/RateLimiterFactory';
import { RateLimiter } from './rateLimiter/RateLimiter';
import { CircuitBreaker } from './circuitBreaker/CircuitBreaker';
import { Semaphore } from './semaphore/Semaphore';
import { LoggingAdapter } from './adapters/LoggingAdapter';
import { TelemetryAdapter } from './adapters/TelemetryAdapter';

const app = express();
const port = 3001;
const loggingAdapter = new LoggingAdapter();
const telemetryAdapter = new TelemetryAdapter();

const rateLimiterStrategy = createRateLimiter('token_bucket', {
    maxTokens: 10,
    refillRate: 1,
    dbPath: './rateLimiterDB',
    key: 'api/endpoint',
    resetThresholdInMillis: 0
});

const rateLimiter = new RateLimiter(rateLimiterStrategy, loggingAdapter, telemetryAdapter);
const circuitBreaker = new CircuitBreaker(5, 60000, () => true, loggingAdapter, telemetryAdapter);
const semaphore = new Semaphore(3, './semaphoreDB', 'resource_key', loggingAdapter, telemetryAdapter);
const clientSDK = new ClientSDK(rateLimiter, circuitBreaker, semaphore, loggingAdapter, telemetryAdapter);

app.get('/', (req, res) => {
    res.send('Welcome to the Rate Limiter Service!');
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

app.get('/test', (req, res) => {
    res.send('Server is running.');
});

app.listen(port, () => {
    console.log(`HTTP server running on port ${port}`);
});
*/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
///////////////////////////////////////////////////////////////////above one but with fixed window counter
/*import express from 'express';
import { ClientSDK } from './ClientSDK/ClientSDK';
import { createRateLimiter } from './rateLimiter/RateLimiterFactory';
import { RateLimiter } from './rateLimiter/RateLimiter';
import { CircuitBreaker } from './circuitBreaker/CircuitBreaker';
import { Semaphore } from './semaphore/Semaphore';
import { LoggingAdapter } from './adapters/LoggingAdapter';
import { TelemetryAdapter } from './adapters/TelemetryAdapter';

const app = express();
const port = 3001;
const loggingAdapter = new LoggingAdapter();
const telemetryAdapter = new TelemetryAdapter();
const rateLimiterStrategy = createRateLimiter('fixed_window', {
    maxRequests: 10,
    windowSizeInMillis: 60000, //60seconds
    dbPath: './rateLimiterDB',
    key: 'api/endpoint'
});
const rateLimiter = new RateLimiter(rateLimiterStrategy, loggingAdapter, telemetryAdapter);
const circuitBreaker = new CircuitBreaker(5, 60000, () => true, loggingAdapter, telemetryAdapter);
const semaphore = new Semaphore(3, loggingAdapter, telemetryAdapter);
const clientSDK = new ClientSDK(rateLimiter, circuitBreaker, semaphore, loggingAdapter, telemetryAdapter);

app.get('/', (req, res) => {
    res.send('Welcome to the Rate Limiter Service!');
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
app.get('/test', (req, res) => {
    res.send('Server is running.');
});

app.listen(port, () => {
    console.log(`HTTP server running on port ${port}`);
});
*/
/////////////////////////////////////////////////////with semaphores
/*import express from 'express';
import { ClientSDK } from './ClientSDK/ClientSDK';
import { createRateLimiter } from './rateLimiter/RateLimiterFactory';
import { RateLimiter } from './rateLimiter/RateLimiter';
import { CircuitBreaker } from './circuitBreaker/CircuitBreaker';
import { Semaphore } from './semaphore/Semaphore';
import { LoggingAdapter } from './adapters/LoggingAdapter';
import { TelemetryAdapter } from './adapters/TelemetryAdapter';

const app = express();
const port = 3001;
const loggingAdapter = new LoggingAdapter();
const telemetryAdapter = new TelemetryAdapter();
const rateLimiterStrategy = createRateLimiter('fixed_window', {
    maxRequests: 10,
    windowSizeInMillis: 60000,
    dbPath: './rateLimiterDB',
    key: 'api/endpoint'
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
});*/
/////////////////////////////////////////////////leaky bucket
const express_1 = __importDefault(require("express"));
const ClientSDK_1 = require("./ClientSDK/ClientSDK");
const RateLimiterFactory_1 = require("./rateLimiter/RateLimiterFactory");
const RateLimiter_1 = require("./rateLimiter/RateLimiter");
const CircuitBreaker_1 = require("./circuitBreaker/CircuitBreaker");
const Semaphore_1 = require("./semaphore/Semaphore");
const LoggingAdapter_1 = require("./adapters/LoggingAdapter");
const TelemetryAdapter_1 = require("./adapters/TelemetryAdapter");
const app = (0, express_1.default)();
const port = 3001;
const loggingAdapter = new LoggingAdapter_1.LoggingAdapter();
const telemetryAdapter = new TelemetryAdapter_1.TelemetryAdapter();
const rateLimiterStrategy = (0, RateLimiterFactory_1.createRateLimiter)('leaky_bucket', {
    maxRequests: 10,
    dbPath: './rateLimiterDB',
    key: 'api/endpoint6',
    loggingAdapter,
    telemetryAdapter
});
const rateLimiter = new RateLimiter_1.RateLimiter(rateLimiterStrategy, loggingAdapter, telemetryAdapter);
const circuitBreaker = new CircuitBreaker_1.CircuitBreaker(5, 60000, () => true, loggingAdapter, telemetryAdapter);
const semaphore = new Semaphore_1.Semaphore(3, './semaphoreDB', 'resource_key', loggingAdapter, telemetryAdapter);
const clientSDK = new ClientSDK_1.ClientSDK(rateLimiter, circuitBreaker, semaphore, loggingAdapter, telemetryAdapter);
app.get('/', (req, res) => {
    res.send('Welcome to the Rate Limiter and Semaphore Service!');
});
app.get('/hit', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const clientId = req.query.clientId;
    if (!clientId) {
        return res.status(400).send('clientId is required');
    }
    try {
        if (yield clientSDK.hitRateLimiter(clientId)) {
            res.send('Rate limit check passed. Processing request...');
        }
        else {
            res.status(429).send('Rate limit exceeded. Try again later.');
        }
    }
    catch (error) {
        const er = error;
        res.status(500).send(er.message);
    }
}));
app.get('/check', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const clientId = req.query.clientId;
    if (!clientId) {
        return res.status(400).send('clientId is required');
    }
    try {
        const allowed = yield clientSDK.checkRateLimiter(clientId);
        res.send(`Request allowed: ${allowed}`);
    }
    catch (error) {
        const er = error;
        res.status(500).send(er.message);
    }
}));
app.get('/semaphore/acquire', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const acquired = yield semaphore.acquire();
        if (acquired) {
            res.send('Resource acquired successfully.');
        }
        else {
            res.status(429).send('Resource limit reached. Cannot acquire.');
        }
    }
    catch (error) {
        const er = error;
        res.status(500).send(er.message);
    }
}));
app.get('/semaphore/release', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield semaphore.release();
        res.send('Resource released successfully.');
    }
    catch (error) {
        const er = error;
        res.status(500).send(er.message);
    }
}));
app.listen(port, () => {
    console.log(`HTTP server running on port ${port}`);
});
