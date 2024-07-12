// import { IPolicy, IPolicyContext } from './Policy';
// import { Semaphore } from './Semaphore';
// class SemaphorePolicy implements IPolicy {
//     private semaphore: Semaphore;

//     constructor(semaphore: Semaphore) {
//         this.semaphore = semaphore;
//     }

//     async execute<T>(fn: (context: IPolicyContext) => PromiseLike<T> | T, signal?: AbortSignal): Promise<T> {
//         const context: IPolicyContext = { signal: signal || new AbortController().signal };
        
//         if (await this.semaphore.acquire(context)) {
//             try {
//                 return await fn(context);
//             } finally {
//                 await this.semaphore.release();
//             }
//         } else {
//             throw new Error('Semaphore acquisition failed');
//         }
//     }
// }