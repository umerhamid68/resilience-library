import { RateLimitingStrategy } from './RateLimitingStrategy';
export module LeakyBucketStrategy {
    export class LeakyBucketStrategy implements RateLimitingStrategy {
        constructor(maxRequests: number, leakRate: number, dbPath: string) {
        }
    
        hit(clientId: string): boolean {
            return false;
        }
    
        check(clientId: string): boolean {
            return false;
        }
    }
}

