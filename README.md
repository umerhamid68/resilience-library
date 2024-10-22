﻿# resilience-library
## Overview
This library provides implementations for rate limiting, semaphore and circuit breaker mechanisms to manage concurrency, rate control and allow for graceful degradation in your applications. It supports different rate limiting strategies like Token Bucket, Leaky Bucket, and Fixed Window Counter. You can also compose multiple policies such as rate limiters, semaphores and circuitbreakers to create more complex control mechanisms.

## Usage
### Rate Limiter
The Rate Limiter supports three different strategies: Fixed Window Counter, Leaky Bucket, and Token Bucket. Each strategy has its own set of configuration options.

### Rate Limiter Options
| Strategy       | Option                | Type    | Default | Required | Description                                        |
|----------------|-----------------------|---------|---------|----------|----------------------------------------------------|
| Fixed Window   | key                   | string  | -       | Yes      | The unique key for the rate limiter.               |
|                | maxRequests           | number  | -       | Yes      | Maximum requests allowed in the window.            |
|                | windowSizeInMillis    | number  | 60000   | No       | Duration of the window in milliseconds.           |
| Leaky Bucket   | key                   | string  | -       | Yes      | The unique key for the rate limiter.               |
|                | maxRequests           | number  | -       | Yes      | Maximum requests allowed in the bucket.            |
|                | resetThresholdInMillis| number  | 60000   | No       | Time before the bucket is reset.                  |
| Token Bucket   | key                   | string  | -       | Yes      | The unique key for the rate limiter.               |
|                | maxTokens             | number  | -       | Yes      | Maximum tokens in the bucket.                      |
|                | refillRate            | number  | 1       | No       | Tokens refilled per second.                       |

### Creating a Rate Limiter
Here is an example of how to create a rate limiter using different strategies.

**Fixed Window Counter**
```typescript
const fixedWindowCounterOptions: FixedWindowCounterOptions = {
    type: 'fixed_window',
    maxRequests: 10,
    key: 'api/endpoint'
};
const fixedWindowRateLimiter = RateLimiter.create(fixedWindowCounterOptions);
```
Alternatively, this approach can also be used:
```typescript
const fixedWindowRateLimiter = RateLimiter.create({
    type: 'fixed_window',
    maxRequests: 10,
    windowSizeInMillis: 60000,
    key: 'api/endpoint_fixed_window'
});
```
For typesafety and ease of understanding, we recommend using the first approach.

**Leaky Bucket**
```typescript
const leakyBucketOptions: LeakyBucketOptions = {
    type: 'leaky_bucket',
    maxRequests: 10,
    key: 'api/endpoint'
};
const leakyBucketRateLimiter = RateLimiter.create(leakyBucketOptions);
```
**Token Bucket**
```typescript
const tokenBucketOptions: TokenBucketOptions = {
    type: 'token_bucket',
    maxTokens: 10,
    key: 'api/endpoint'
};
const tokenBucketRateLimiter = RateLimiter.create(tokenBucketOptions);
```

### Using Rate Limiter with HTTP Requests
Here's a simple example of using the rate limiter with HTTP requests.

**Hit Request**
```typescript
import { RateLimiter } from './RateLimiter';
import { TokenBucketOptions} from './rateLimiter/RateLimitingStrategyOptions';
import fetch from 'node-fetch';

const tokenBucketOptions: TokenBucketOptions = {
    type: 'token_bucket',
    maxTokens: 10,
    key: 'api/endpoint'
};
const tokenBucketRateLimiter = RateLimiter.create(tokenBucketOptions);

async function makeRequest(url: string, clientId: string) {
    try {
        if (await tokenBucketRateLimiter.hit(clientId)) {
            const response = await fetch(url);
            const data = await response.json();
            console.log('Request successful:', data);
        } else {
            console.log('Rate limit exceeded. Try again later.');
        }
    } catch (error) {
        console.error('Request failed:', error);
    }
}

//usage
const url = 'https://jsonplaceholder.typicode.com/todos/1';
const clientId = 'testClient';

makeRequest(url, clientId);
```
**Check Request**
In case you don't want to send a request and simply want to check whether the request will go through or not if sent, we have the *check function* of the rate limiter for this purpose. Calling check will not affect the queues or buckets of the rate limiters.

```typescript
async function checkRateLimiter(clientId: string) {
    try {
        const allowed = await tokenBucketRateLimiter.check(clientId);
        console.log(`Request allowed: ${allowed}`);
    } catch (error) {
        console.error('Check failed:', error);
    }
}

// Usage
checkRateLimiter(clientId);
```

## Semaphore
The Semaphore component manages concurrent access to a resource by limiting the number of concurrent requests.

### Semaphore Options
| Option          | Type    | Default | Required | Description                                |
|-----------------|---------|---------|----------|--------------------------------------------|
| key             | string  | -       | Yes      | The unique key for the semaphore.           |
| maxConcurrent   | number  | -       | Yes      | The maximum number of concurrent accesses.  |


### Creating a Semaphore
To create a semaphore, specify the unique key and the maximum number of concurrent accesses.

```typescript
import { Semaphore } from './Semaphore';

const semaphore = Semaphore.create('resource_key', 3);
```

### Using Semaphore for Resource Acquisition and Release
You can manually acquire and release resources using the acquire and release methods.

**Acquire**
```typescript
async function acquireResource() {
    const acquired = await semaphore.acquire();
    if (acquired) {
        console.log('Resource acquired successfully.');
    } else {
        console.log('Resource limit reached. Cannot acquire.');
    }
}

// Acquire resource
acquireResource();
```

**Release**
```typescript
async function releaseResource() {
    try {
        await semaphore.release();
        console.log('Resource released successfully.');
    } catch (error) {
        const er = error as Error;
        console.error('Release failed:', er.message);
    }
}

// Release resource
releaseResource();
```

### Using Semaphore with HTTP Requests
Here’s a simple example of using the semaphore to manage concurrent HTTP requests.

```typescript
import { Semaphore } from './Semaphore';
import axios from 'axios';

// Create semaphore instance with a limit of 3 concurrent accesses
const semaphore = Semaphore.create('resource_key', 3);

// Define the HTTP request function
async function makeRequest() {
    try {
        await semaphore.execute(async () => {
            const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1');
            console.log(response.data);
        });
    } catch (error) {
        const er = error as Error;
        console.error('Request failed:', er.message);
    }
}

// Make a request
makeRequest();
```

## Circuit Breaker
The Circuit Breaker component helps in managing failure handling and graceful degradation in your applications. It supports two different strategies: Error Percentage and Explicit Threshold.

### Circuit Breaker Options
Here are the options you can use when creating a Circuit Breaker:

| Strategy           | Option                  | Type                  | Default | Required | Description                                                                                      |
|--------------------|-------------------------|-----------------------|---------|----------|--------------------------------------------------------------------------------------------------|
| Base Options       | resourceName            | string                | -       | Yes      | The unique name for the resource being protected.                                                |
|                    | rollingWindowSize       | number                | -       | Yes      | The size of the rolling window for tracking metrics.                                             |
|                    | sleepWindow             | number                | -       | Yes      | Time period after which the circuit breaker transitions from OPEN to HALF_OPEN.                  |
|                    | fallbackMethod          | () => any             | -       | No       | Fallback method to execute when the circuit is OPEN.                                             |
|                    | pingService             | () => Promise<boolean>| -       | No       | Method to check the availability of the service.                                                 |
| Error Percentage   | requestVolumeThreshold  | number                | -       | Yes      | Minimum number of requests in the rolling window before considering error percentage.           |
|                    | errorThresholdPercentage| number                | -       | Yes      | Error percentage at which the circuit breaker opens.                                             |
| Explicit Threshold | failureThreshold        | number                | -       | Yes      | Number of failures at which the circuit breaker opens.                                            |
|                    | timeoutThreshold        | number                | -       | Yes      | Number of timeouts at which the circuit breaker opens.                                            |
|                    | successThreshold        | number                | -       | Yes      | Number of successes needed to close the circuit breaker.                                          |

### Creating a Circuit Breaker
Here is an example of how to create a circuit breaker using different strategies.

**Error Percentage Strategy**
```typescript
import { CircuitBreakerFactory } from './circuitBreaker/CircuitBreaker';
import { ErrorPercentageCircuitBreakerOptions } from './circuitBreaker/CircuitBreakerOptions';

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

const errorPercentageCircuitBreaker = CircuitBreakerFactory.create(errorPercentageOptions);
```

**Explicit Threshold Strategy**
```typescript
import { CircuitBreakerFactory } from './circuitBreaker/CircuitBreaker';
import { ExplicitThresholdCircuitBreakerOptions } from './circuitBreaker/CircuitBreakerOptions';

const explicitThresholdOptions: ExplicitThresholdCircuitBreakerOptions = {
    resourceName: 'ResourceService',
    rollingWindowSize: 10000,
    failureThreshold: 5,
    timeoutThreshold: 2,
    successThreshold: 3,
    sleepWindow: 3000,
    fallbackMethod: () => 'Fallback response',
    pingService: async () => {
        const isServiceOperational = Math.random() < 0.8; // 80% chance of service being operational
        return isServiceOperational;
    }
};

const explicitThresholdCircuitBreaker = CircuitBreakerFactory.create(explicitThresholdOptions);
```

### Using Circuit Breaker with HTTP Requests
Here’s a simple example of using the circuit breaker to manage HTTP requests.

```typescript
import { CircuitBreakerFactory } from './circuitBreaker/CircuitBreaker';
import { ErrorPercentageCircuitBreakerOptions } from './circuitBreaker/CircuitBreakerOptions';
import axios from 'axios';

// Define circuit breaker options
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

// Create circuit breaker instance
const circuitBreaker = CircuitBreakerFactory.create(errorPercentageOptions);

// Define the HTTP request function
async function makeRequest() {
    try {
        await circuitBreaker.execute(async () => {
            const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1');
            console.log(response.data);
        });
    } catch (error) {
        const er = error as Error;
        console.error('Request failed:', er.message);
    }
}

// Make a request
makeRequest();
```

## Composing Policies
The Policy class allows you to compose multiple policies such as rate limiters, circuit breakers, and semaphores to create a combined policy. This combined policy will process requests in the order the policies are wrapped. If any policy component causes an error, it will throw an error and the request will not proceed further.

### Example of Composing Policies
Here is an example of how to compose a rate limiter, circuit breaker, and semaphore:

```typescript
import { RateLimiter } from './RateLimiter';
import { TokenBucketOptions } from './rateLimiter/RateLimitingStrategyOptions';
import { CircuitBreakerFactory } from './circuitBreaker/CircuitBreaker';
import { ErrorPercentageCircuitBreakerOptions } from './circuitBreaker/CircuitBreakerOptions';
import { Semaphore } from './Semaphore';
import { Policy } from './Policy';
import axios from 'axios';

// Define token bucket options
const tokenBucketOptions: TokenBucketOptions = {
    type: 'token_bucket',
    maxTokens: 10,
    refillRate: 1,
    key: 'api/endpoint'
};

// Create rate limiter instance
const rateLimiter = RateLimiter.create(tokenBucketOptions);

// Define circuit breaker options
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

// Create circuit breaker instance
const circuitBreaker = CircuitBreakerFactory.create(errorPercentageOptions);

// Create semaphore instance with a limit of 3 concurrent accesses
const semaphore = Semaphore.create('resource_key', 3);

// Combine the policies
const policy = Policy.wrap(semaphore, rateLimiter, circuitBreaker);

// Define the HTTP request function
async function makeRequest() {
    try {
        await policy.execute(async () => {
            const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1');
            console.log(response.data);
        });
    } catch (error) {
        const er = error as Error;
        console.error('Request failed:', er.message);
    }
}

// Make a request
makeRequest();
```

**How It Works**
- When a request is made, it passes through the policies in the order they are wrapped.
- The request will first go through the semaphore, then the rate limiter, and finally the circuit breaker.
- If any policy component causes an error (e.g., rate limit exceeded, circuit breaker open, semaphore limit reached), the request will be blocked and the error will be thrown.

### Using Hooks for Logging and Telemetry
The Policy class supports beforeExecute and afterExecute hooks. These hooks can be used for logging and telemetry purposes, allowing you to capture events before and after the execution of the policy.

Example Use:

```typescript
policy.beforeExecute = async (context: IPolicyContext) => {
    loggingAdapter.log('Before execution');
    telemetryAdapter.collect({ event: 'before_execution' });
};

policy.afterExecute = async (context: IPolicyContext) => {
    loggingAdapter.log('After execution');
    telemetryAdapter.collect({ event: 'after_execution' });
};
```
