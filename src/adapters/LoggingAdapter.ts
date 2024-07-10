export interface LoggingAdapter {
    log(message: string): void;
}

export class DefaultLoggingAdapter implements LoggingAdapter {
    log(message: string): void {
        console.log(`Log: ${message}`);
    }
}
