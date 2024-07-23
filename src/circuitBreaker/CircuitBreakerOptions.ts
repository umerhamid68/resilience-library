
export interface BaseCircuitBreakerOptions {
    resourceName: string;
    rollingWindowSize: number;
    sleepWindow: number;
    slowCallDurationThreshold?:number;
    fallbackMethod?: () => any;
    pingService?: () => Promise<boolean>;
}

export interface ErrorPercentageCircuitBreakerOptions extends BaseCircuitBreakerOptions {
    requestVolumeThreshold: number;
    errorThresholdPercentage: number;
}

export interface ExplicitThresholdCircuitBreakerOptions extends BaseCircuitBreakerOptions {
    failureThreshold: number;
    timeoutThreshold: number;
    successThreshold: number;
}
