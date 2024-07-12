//import { RateLimiter } from './RateLimiter';
import { RateLimiter } from './RateLimiter';
import { CircuitBreaker } from './circuitBreaker/CircuitBreaker';
import { Semaphore } from './Semaphore';
import { LoggingAdapter } from './adapters/LoggingAdapter';
import { TelemetryAdapter } from './adapters/TelemetryAdapter';

export interface IPolicyContext {
    signal: AbortSignal;
}

export interface IPolicy {
    execute<T>(fn: (context: IPolicyContext) => PromiseLike<T> | T, signal?: AbortSignal): Promise<T>;
}

export class Policy implements IPolicy {
    private policies: IPolicy[];

    constructor(...policies: IPolicy[]) {
        this.policies = policies;
    }

    async execute<T>(fn: (context: IPolicyContext) => PromiseLike<T> | T, signal: AbortSignal = new AbortController().signal): Promise<T> {
        const run = (context: IPolicyContext, i: number): PromiseLike<T> | T =>
            i === this.policies.length
                ? fn(context)
                : this.policies[i].execute(nextContext => run({ ...context, ...nextContext }, i + 1), context.signal);

        return Promise.resolve(run({ signal }, 0));
    }
}

export function wrap(...policies: IPolicy[]): IPolicy {
    return new Policy(...policies);
}
