//////////////////////////new approach
export interface BaseRateLimiterOptions {
    key: string;
}

export interface FixedWindowCounterOptions extends BaseRateLimiterOptions {
    type: 'fixed_window';
    maxRequests: number;
    windowSizeInMillis?: number;
}

export interface LeakyBucketOptions extends BaseRateLimiterOptions {
    type: 'leaky_bucket';
    maxRequests: number;
    resetThresholdInMillis?: number;
}

export interface TokenBucketOptions extends BaseRateLimiterOptions {
    type: 'token_bucket';
    maxTokens: number;
    refillRate?: number;
}

export type RateLimiterOptions = FixedWindowCounterOptions | LeakyBucketOptions | TokenBucketOptions;
