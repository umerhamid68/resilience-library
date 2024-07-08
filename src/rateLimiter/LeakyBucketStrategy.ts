////////////////////////////////////////////////////// promises
import { RateLimitingStrategy } from './RateLimitingStrategy';
import rocksdb from 'rocksdb';

export module LeakyBucketStrategy {
    export class LeakyBucketStrategy implements RateLimitingStrategy {
        private maxRequests: number;
        private processInterval: number; //milliseconds
        private queue: Array<string>;
        private db: rocksdb;

        constructor(maxRequests: number, processInterval: number, dbPath: string) {
            this.maxRequests = maxRequests;
            this.processInterval = processInterval;
            this.queue = [];
            this.db = rocksdb(dbPath);
            this.db.open({ create_if_missing: true }, (err) => {
                if (err) {
                    console.error('Failed to open the database:', err);
                }
            });

            // setTimeout(() => {
            //     setInterval(this.processRequests.bind(this), this.processInterval);
            // }, this.processInterval);
        }

        private async processRequests() {
            if (this.queue.length > 0) {
                const clientId = this.queue.shift();
                //console.log(clientId);
                if (clientId) {
                    await new Promise<void>((resolve, reject) => {
                        this.db.put(clientId, 'processed', (err) => {
                            if (err) {
                                console.error('Failed to process request:', err);
                                reject(err);
                            } else {
                                console.log(`Processed request for client: ${clientId}`);
                                resolve();
                            }
                        });
                    });
                }
            }
        }

        async hit(clientId: string): Promise<boolean> {
            if (!clientId) {
                throw new Error('clientId cannot be null or undefined');
            }

            if (this.queue.length < this.maxRequests) {
                this.queue.push(clientId);
                console.log(`Client ${clientId} added to the queue. Queue size: ${this.queue.length}`);
                return true;
            } else {
                console.log(`Client ${clientId} request discarded. Queue is full.`);
                return false;
            }
        }

        async check(clientId: string): Promise<boolean> {
            if (!clientId) {
                throw new Error('clientId cannot be null or undefined');
            }

            console.log(`Checking if client ${clientId} can be added to the queue. Queue size: ${this.queue.length}`);
            return this.queue.length < this.maxRequests;
        }
    }
}
