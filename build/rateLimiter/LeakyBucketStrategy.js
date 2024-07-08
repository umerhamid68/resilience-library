"use strict";
////////////////////////////////interval not working correctly
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeakyBucketStrategy = void 0;
const rocksdb_1 = __importDefault(require("rocksdb"));
var LeakyBucketStrategy;
(function (LeakyBucketStrategy_1) {
    class LeakyBucketStrategy {
        constructor(maxRequests, processInterval, dbPath) {
            this.maxRequests = maxRequests;
            this.processInterval = processInterval;
            this.queue = [];
            this.db = (0, rocksdb_1.default)(dbPath);
            this.db.open({ create_if_missing: true }, (err) => {
                if (err) {
                    console.error('Failed to open the database:', err);
                }
            });
            // setTimeout(() => {
            //     setInterval(this.processRequests.bind(this), this.processInterval);
            // }, this.processInterval);
        }
        processRequests() {
            return __awaiter(this, void 0, void 0, function* () {
                if (this.queue.length > 0) {
                    const clientId = this.queue.shift();
                    //console.log(clientId);
                    if (clientId) {
                        yield new Promise((resolve, reject) => {
                            this.db.put(clientId, 'processed', (err) => {
                                if (err) {
                                    console.error('Failed to process request:', err);
                                    reject(err);
                                }
                                else {
                                    console.log(`Processed request for client: ${clientId}`);
                                    resolve();
                                }
                            });
                        });
                    }
                }
            });
        }
        hit(clientId) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!clientId) {
                    throw new Error('clientId cannot be null or undefined');
                }
                if (this.queue.length < this.maxRequests) {
                    this.queue.push(clientId);
                    console.log(`Client ${clientId} added to the queue. Queue size: ${this.queue.length}`);
                    return true;
                }
                else {
                    console.log(`Client ${clientId} request discarded. Queue is full.`);
                    return false;
                }
            });
        }
        check(clientId) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!clientId) {
                    throw new Error('clientId cannot be null or undefined');
                }
                console.log(`Checking if client ${clientId} can be added to the queue. Queue size: ${this.queue.length}`);
                return this.queue.length < this.maxRequests;
            });
        }
    }
    LeakyBucketStrategy_1.LeakyBucketStrategy = LeakyBucketStrategy;
})(LeakyBucketStrategy || (exports.LeakyBucketStrategy = LeakyBucketStrategy = {}));
////////////////////////////////////////////// without promises
/*import { RateLimitingStrategy } from './RateLimitingStrategy';
import rocksdb from 'rocksdb';

export module LeakyBucketStrategy {
    export class LeakyBucketStrategy implements RateLimitingStrategy {
        private maxRequests: number;
        private processInterval: number; //ms
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

            
            setInterval(this.processRequests.bind(this), this.processInterval);
        }

        private processRequests() {
            if (this.queue.length > 0) {
                const clientId = this.queue.shift();
                if (clientId) {
                    this.db.put(clientId, 'processed', (err) => {
                        if (err) {
                            console.error('Failed to process request:', err);
                        } else {
                            console.log(`Processed request for client: ${clientId}`);
                        }
                    });
                }
            }
        }

        hit(clientId: string): boolean {
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

        check(clientId: string): boolean {
            if (!clientId) {
                throw new Error('clientId cannot be null or undefined');
            }

            console.log(`Checking if client ${clientId} can be added to the queue. Queue size: ${this.queue.length}`);
            return this.queue.length < this.maxRequests;
        }
    }
}
*/ 
