// ////////////////////////////////////////////////////////parameter passing logic
// import { RateLimitingStrategy } from './RateLimitingStrategy';
// import rocksdb from 'rocksdb';
// import { Mutex } from 'async-mutex';
// import { TokenBucketOptions } from './RateLimitingStrategyOptions';
// import { join } from 'path';
// import { existsSync, mkdirSync } from 'fs';
// export module TokenBucketStrategy {
//     export class TokenBucketStrategy implements RateLimitingStrategy {
//         private maxTokens: number;
//         private refillRate: number; // per second
//         private db: rocksdb;
//         private key: string;
//         //private resetThresholdInMillis: number;
//         private dbReady: Promise<void>;
//         private mutex: Mutex;

//         constructor(options: TokenBucketOptions) {
//             this.maxTokens = options.maxTokens;
//             this.refillRate = options.refillRate || 1;
//             this.key = options.key;
//             const dbPath = join(__dirname, 'db', 'TokenBucket');
//             if (!existsSync(dbPath)) {
//                 mkdirSync(dbPath, { recursive: true });
//             }
//             this.db = rocksdb(dbPath);
//             this.mutex = new Mutex();
//             this.dbReady = new Promise((resolve, reject) => {
//                 this.db.open({ create_if_missing: true }, async (err) => {
//                     if (err) {
//                         console.log(`failed to open database: ${err}`);
//                         reject(err);
//                     } else {
//                         console.log('database open.');
//                         await this.resetKeyIfExists();
//                         console.log('here');
//                         resolve();
//                     }
//                 });
//             });
            
//         }
//         private async resetKeyIfExists(): Promise<void> {
//             return this.mutex.runExclusive(async () => {
//                 return new Promise<void>((resolve, reject) => {
//                     this.db.get(this.key, (err, value) => {
//                         if (err && err.message.includes('NotFound')) {
//                             console.log(`key not in DB. making new bucket state.`);
//                             resolve();
//                         } else if (!err) {
//                             console.log(`Existing key detected. Deleting key: ${this.key}`);
//                             this.db.del(this.key, {}, (delErr) => {
//                                 if (delErr) {
//                                     reject(delErr);
//                                 } else {
//                                     console.log(`Key deleted: ${this.key}`);
//                                     resolve();
//                                 }
//                             });
//                         } else {
//                             reject(err);
//                         }
//                     });
//                 });
//             });
//         }

//         // private async refill() {
//         //     await this.dbReady;
//         //     const now = Date.now();
//         //     const { tokens, lastRefill } = await this.getBucketState();
//         //     const elapsed = (now - lastRefill) / 1000;

//         //     if (now - lastRefill > this.resetThresholdInMillis) {
//         //         console.log(`time ${elapsed}s exceeds threshold. resetting`);
//         //         await this.updateBucketState(this.maxTokens, now);
//         //         console.log(`refilled 0 tokens (reset), new token count: ${this.maxTokens}`);
//         //     } else {
//         //         const refillAmount = Math.max(0, Math.floor(elapsed * this.refillRate));
//         //         const newTokens = Math.min(this.maxTokens, tokens + refillAmount);
//         //         await this.updateBucketState(newTokens, now);
//         //         console.log(`refilled ${refillAmount} tokens (${elapsed}s), new token count: ${newTokens}`);
//         //     }
//         // }
//         private async refill() {
//             await this.dbReady;
//             const now = Date.now();
//             const { tokens, lastRefill } = await this.getBucketState();
//             const elapsed = (now - lastRefill) / 1000;

//             const refillAmount = Math.max(0, Math.floor(elapsed * this.refillRate));
//             const newTokens = Math.min(this.maxTokens, tokens + refillAmount);
//             await this.updateBucketState(newTokens, now);
//             console.log(`refilled ${refillAmount} tokens (${elapsed}s), new token count: ${newTokens}`);
//         }

//         private async getBucketState(): Promise<{ tokens: number, lastRefill: number }> {
//             return this.mutex.runExclusive(async () => {
//                 return new Promise<{ tokens: number, lastRefill: number }>((resolve, reject) => {
//                     this.db.get(this.key, (err, value) => {
//                         if (err) {
//                             if (err.message.includes('NotFound')) {
//                                 console.log(`key not in DB. making new bucket state.`);
//                                 resolve({ tokens: this.maxTokens, lastRefill: Date.now() });
//                             } else {
//                                 reject(err);
//                             }
//                         } else {
//                             try {
//                                 const [tokensStr, lastRefillStr] = value.toString().split(':');
//                                 const tokens = Number(tokensStr);
//                                 const lastRefill = Number(lastRefillStr);
//                                 if (isNaN(tokens) || isNaN(lastRefill)) {
//                                     throw new Error('invalid data format');
//                                 }
//                                 console.log(`-- gotten state from DB:: key: ${this.key}, tokens: ${tokens}, last Refill: ${lastRefill}`);
//                                 resolve({ tokens, lastRefill });
//                             } catch (error) {
//                                 console.log(`error parsing data: ${value.toString()}`);
//                                 reject(new Error('invalid data format'));
//                             }
//                         }
//                     });
//                 });
//             });
//         }

//         private async updateBucketState(tokens: number, lastRefill: number): Promise<void> {
//             return this.mutex.runExclusive(async () => {
//                 return new Promise<void>((resolve, reject) => {
//                     const data = `${tokens}:${lastRefill}`;
//                     this.db.put(this.key, data, (err) => {
//                         if (err) {
//                             reject(err);
//                         } else {
//                             console.log(`-- updated state in DB:: key: ${this.key}, data: ${data}`);
//                             resolve();
//                         }
//                     });
//                 });
//             });
//         }

//         private async evaluate(clientId: string, updateState: boolean): Promise<boolean> {
//             await this.refill();
//             const { tokens, lastRefill } = await this.getBucketState();
//             const now = Date.now();
//             const nextRefillTokens = Math.max(0, Math.floor(((now - lastRefill) / 1000) * this.refillRate));
        
//             if (!updateState) {
//                 console.log(`Client ${clientId} check - Current tokens: ${tokens}`);
//             }
        
//             if (tokens > 0) {
//                 if (updateState) {
//                     await this.updateBucketState(tokens - 1, Date.now());
//                     console.log(`Client ${clientId} hit successful. Tokens left: ${tokens - 1}`);
//                 }
//                 return true;
//             }
        
//             console.log(`Client ${clientId} hit failed. No tokens left.`);
//             return false;
//         }
        

//         async hit(clientId: string): Promise<boolean> {
//             return this.evaluate(clientId, true);
//         }

//         async check(clientId: string): Promise<boolean> {
//             return this.evaluate(clientId, false);
//         }
//     }
// }



///////////////////////////////database abstraction
/*import { RateLimitingStrategy } from './RateLimitingStrategy';
import { Database } from '../Database';
import { TokenBucketOptions } from './RateLimitingStrategyOptions';

export module TokenBucketStrategy {
    export class TokenBucketStrategy implements RateLimitingStrategy {
        private maxTokens: number;
        private refillRate: number; // per second
        private key: string;
        private db: Database;

        constructor(options: TokenBucketOptions) {
            this.maxTokens = options.maxTokens;
            this.refillRate = options.refillRate || 1;
            this.key = options.key;
            console.log('here7');
            this.db = Database.getInstance();
            console.log('here8');

            // Ensure database is initialized before proceeding
            this.initialize().catch(err => console.error(`Error initializing TokenBucketStrategy: ${err}`));
        }

        private async initialize() {
            console.log('here9');
            await this.db.waitForInitialization();
            console.log('here10');
            await this.resetKeyIfExists();
        }

        private async resetKeyIfExists(): Promise<void> {
            console.log('here11');
            const value = await this.db.get(this.key);
            console.log('here12');
            if (value !== null) {
                await this.db.del(this.key);
            }
        }

        private async refill() {
            const now = Date.now();
            const { tokens, lastRefill } = await this.getBucketState();
            const elapsed = (now - lastRefill) / 1000;

            const refillAmount = Math.max(0, Math.floor(elapsed * this.refillRate));
            const newTokens = Math.min(this.maxTokens, tokens + refillAmount);
            await this.updateBucketState(newTokens, now);
        }

        private async getBucketState(): Promise<{ tokens: number, lastRefill: number }> {
            const value = await this.db.get(this.key);
            if (value === null) {
                return { tokens: this.maxTokens, lastRefill: Date.now() };
            }

            const [tokensStr, lastRefillStr] = value.split(':');
            const tokens = Number(tokensStr);
            const lastRefill = Number(lastRefillStr);
            if (isNaN(tokens) || isNaN(lastRefill)) {
                throw new Error('Invalid data format');
            }

            return { tokens, lastRefill };
        }

        private async updateBucketState(tokens: number, lastRefill: number): Promise<void> {
            const data = `${tokens}:${lastRefill}`;
            await this.db.put(this.key, data);
        }

        private async evaluate(clientId: string, updateState: boolean): Promise<boolean> {
            await this.refill();
            const { tokens, lastRefill } = await this.getBucketState();
            const now = Date.now();
            const nextRefillTokens = Math.max(0, Math.floor(((now - lastRefill) / 1000) * this.refillRate));

            if (!updateState) {
                console.log(`Client ${clientId} check - Current tokens: ${tokens}`);
            }

            if (tokens > 0) {
                if (updateState) {
                    await this.updateBucketState(tokens - 1, Date.now());
                    console.log(`Client ${clientId} hit successful. Tokens left: ${tokens - 1}`);
                }
                return true;
            }
            console.log(`Client ${clientId} hit failed. No tokens left.`);

            return false;
        }

        async hit(clientId: string): Promise<boolean> {
            return this.evaluate(clientId, true);
        }

        async check(clientId: string): Promise<boolean> {
            return this.evaluate(clientId, false);
        }
    }
}

*/




/////////////////////////////
import { RateLimitingStrategy } from './RateLimitingStrategy';
import { Database } from '../Database';
import { TokenBucketOptions } from './RateLimitingStrategyOptions';

export module TokenBucketStrategy {
    export class TokenBucketStrategy implements RateLimitingStrategy {
        private maxTokens: number;
        private refillRate: number; // per second
        private key: string;
        private db: Database;
        private dbInitialized: Promise<void>;

        constructor(options: TokenBucketOptions) {
            this.maxTokens = options.maxTokens;
            this.refillRate = options.refillRate || 1;
            this.key = options.key;
            this.db = Database.getInstance();
            this.dbInitialized = this.initialize();
        }

        private async initialize() {
            await this.db.waitForInitialization();
            await this.resetKeyIfExists();
        }

        private async resetKeyIfExists(): Promise<void> {
            const value = await this.db.get(this.key);
            if (value !== null) {
                //console.log('deleting');
                await this.db.del(this.key);
            }
        }

        private async refill() {
            await this.dbInitialized;
            const now = Date.now();
            const { tokens, lastRefill } = await this.getBucketState();
            const elapsed = (now - lastRefill) / 1000;

            const refillAmount = Math.max(0, Math.floor(elapsed * this.refillRate));
            const newTokens = Math.min(this.maxTokens, tokens + refillAmount);
            await this.updateBucketState(newTokens, now);
        }

        private async getBucketState(): Promise<{ tokens: number, lastRefill: number }> {
            const value = await this.db.get(this.key);
            if (value === null) {
                return { tokens: this.maxTokens, lastRefill: Date.now() };
            }

            const [tokensStr, lastRefillStr] = value.split(':');
            const tokens = Number(tokensStr);
            const lastRefill = Number(lastRefillStr);
            if (isNaN(tokens) || isNaN(lastRefill)) {
                throw new Error('Invalid data format');
            }

            return { tokens, lastRefill };
        }

        private async updateBucketState(tokens: number, lastRefill: number): Promise<void> {
            const data = `${tokens}:${lastRefill}`;
            await this.db.put(this.key, data);
        }

        private async evaluate(clientId: string, updateState: boolean): Promise<boolean> {
            await this.refill();
            const { tokens } = await this.getBucketState();

            if (!updateState) {
                console.log(`Client ${clientId} check - Current tokens: ${tokens}`);
            }

            if (tokens > 0) {
                if (updateState) {
                    await this.updateBucketState(tokens - 1, Date.now());
                    console.log(`Client ${clientId} hit successful. Tokens left: ${tokens - 1}`);
                }
                return true;
            }
            console.log(`Client ${clientId} hit failed. No tokens left.`);
            return false;
        }

        async hit(clientId: string): Promise<boolean> {
            return this.evaluate(clientId, true);
        }

        async check(clientId: string): Promise<boolean> {
            return this.evaluate(clientId, false);
        }
    }
}

