export interface RateLimitingStrategy {
    hit(clientId: string): Promise<boolean>;
    check(clientId: string): Promise<boolean>;
}

