export interface RateLimitingStrategy {
    hit(clientId: string): boolean;
    check(clientId: string): boolean;
}
