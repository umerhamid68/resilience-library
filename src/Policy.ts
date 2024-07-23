// ///////////////////////hooks
// import { RateLimiter } from './RateLimiter';
// import { CircuitBreaker } from './circuitBreaker/CircuitBreaker';
// import { Semaphore } from './Semaphore';
// import { LoggingAdapter } from './adapters/LoggingAdapter';
// import { TelemetryAdapter } from './adapters/TelemetryAdapter';

// export interface IPolicyContext {
//     signal: AbortSignal;
// }

// export interface IPolicy {
//     execute<T>(fn: (context: IPolicyContext) => PromiseLike<T> | T, signal?: AbortSignal): Promise<T>;
//     beforeExecute?: (context: IPolicyContext) => Promise<void>;
//     afterExecute?: (context: IPolicyContext) => Promise<void>;
// }

// export class Policy implements IPolicy {
//     private policies: IPolicy[];
//     public beforeExecute?: (context: IPolicyContext) => Promise<void>;
//     public afterExecute?: (context: IPolicyContext) => Promise<void>;

//     constructor(...policies: IPolicy[]) {
//         this.policies = policies;
//     }

//     async execute<T>(fn: (context: IPolicyContext) => PromiseLike<T> | T, signal: AbortSignal = new AbortController().signal): Promise<T> {
//         const context = { signal };
        
//         if (this.beforeExecute) {
//             await this.beforeExecute(context);
//         }

//         const run = async (i: number): Promise<T> => {
//             if (i === this.policies.length) {
//                 return await fn(context);
//             }
//             const policy = this.policies[i];
//             return await policy.execute(() => run(i + 1), context.signal);
//         };

//         const result = await run(0);

//         if (this.afterExecute) {
//             await this.afterExecute(context);
//         }

//         return result;
//     }

//     static wrap(...policies: IPolicy[]): IPolicy {
//         return new Policy(...policies);
//     }
// }




///////////////////////////////individual component access
import { RateLimiter } from './RateLimiter';
import { CircuitBreaker } from './circuitBreaker/CircuitBreaker';
import { Semaphore } from './Semaphore';
/*import { LoggingAdapter } from './adapters/LoggingAdapter';
import { TelemetryAdapter } from './adapters/TelemetryAdapter';*/

export interface IPolicyContext {
    signal: AbortSignal;
}

export interface IPolicy {
    execute<T>(fn: (context: IPolicyContext) => PromiseLike<T> | T, signal?: AbortSignal): Promise<T>;
    beforeExecute?: (context: IPolicyContext) => Promise<void>;
    afterExecute?: (context: IPolicyContext) => Promise<void>;
}

export class Policy implements IPolicy {
    public rateLimiter?: RateLimiter;
    public circuitBreaker?: CircuitBreaker;
    public semaphore?: Semaphore;
    private policies: IPolicy[];
    public beforeExecute?: (context: IPolicyContext) => Promise<void>;
    public afterExecute?: (context: IPolicyContext) => Promise<void>;

    constructor(...policies: IPolicy[]) {
        this.policies = policies;

        // Assign individual policies to class properties
        policies.forEach(policy => {
            if (policy instanceof RateLimiter) {
                this.rateLimiter = policy;
            } else if (policy instanceof CircuitBreaker) {
                this.circuitBreaker = policy;
            } else if (policy instanceof Semaphore) {
                this.semaphore = policy;
            }
        });
    }

    async execute<T>(fn: (context: IPolicyContext) => PromiseLike<T> | T, signal: AbortSignal = new AbortController().signal): Promise<T> {
        const context = { signal };

        if (this.beforeExecute) {
            await this.beforeExecute(context);
        }

        const run = async (i: number): Promise<T> => {
            if (i === this.policies.length) {
                return await fn(context);
            }
            const policy = this.policies[i];
            return await policy.execute(() => run(i + 1), context.signal);
        };

        const result = await run(0);

        if (this.afterExecute) {
            await this.afterExecute(context);
        }

        return result;
    }

    static wrap(...policies: IPolicy[]): Policy {
        return new Policy(...policies);
    }
}







/////////////////////////////////////
/*
async function fetchData({ signal }: IPolicyContext): Promise<string> {
    const response = await fetch('https://api.example.com/data', { signal });
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return await response.text();
}

const controller = new AbortController();
const signal = controller.signal;

setTimeout(() => controller.abort(), 5000); // Abort the request after 5 seconds

try {
    const data = await rateLimiter.execute(fetchData, signal);
    console.log(data);
} catch (error) {
    console.error('Request failed:', error);
}








*/