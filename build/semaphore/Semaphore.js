"use strict";
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
exports.Semaphore = void 0;
/////////////////////////////////////////new semaphore implementation
const rocksdb_1 = __importDefault(require("rocksdb"));
class Semaphore {
    constructor(maxConcurrent, dbPath, key, loggingAdapter, telemetryAdapter) {
        this.maxConcurrent = maxConcurrent;
        this.loggingAdapter = loggingAdapter;
        this.telemetryAdapter = telemetryAdapter;
        this.key = key;
        this.db = (0, rocksdb_1.default)(dbPath);
        this.dbReady = new Promise((resolve, reject) => {
            this.db.open({ create_if_missing: true }, (err) => {
                if (err) {
                    console.error('failed to open database:', err);
                    reject(err);
                }
                else {
                    console.log('database opened.');
                    resolve();
                }
            });
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.dbReady;
            return new Promise((resolve, reject) => {
                this.db.close((err) => {
                    if (err) {
                        console.error('failed to close database:', err);
                        reject(err);
                    }
                    else {
                        console.log('database closed.');
                        resolve();
                    }
                });
            });
        });
    }
    getResourceCount() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.dbReady;
            return new Promise((resolve, reject) => {
                this.db.get(this.key, (err, value) => {
                    if (err) {
                        if (err.message.includes('NotFound')) {
                            console.log(`key not found in DB. starting new resource count.`);
                            resolve(0);
                        }
                        else {
                            reject(err);
                        }
                    }
                    else {
                        try {
                            const count = Number(value.toString());
                            if (isNaN(count)) {
                                throw new Error('invalid data format');
                            }
                            console.log(`--gotten resource count from DB:: Key: ${this.key}, Count: ${count}`);
                            resolve(count);
                        }
                        catch (error) {
                            console.error(`error parsing data: ${value.toString()}`);
                            reject(new Error('invalid data format'));
                        }
                    }
                });
            });
        });
    }
    updateResourceCount(count) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.dbReady;
            return new Promise((resolve, reject) => {
                this.db.put(this.key, count.toString(), (err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        console.log(`--updated resource count in DB:: Key: ${this.key}, Count: ${count}`);
                        resolve();
                    }
                });
            });
        });
    }
    acquire() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.dbReady;
            const currentCount = yield this.getResourceCount();
            if (currentCount >= this.maxConcurrent) {
                console.log(`resource limit reached. cannot get more.`);
                return false;
            }
            yield this.updateResourceCount(currentCount + 1);
            this.loggingAdapter.log(`resource acquired. Current count: ${currentCount + 1}`);
            console.log(`resource acquired. Current count: ${currentCount + 1}`);
            this.telemetryAdapter.collect({ event: 'resource_acquired', count: currentCount + 1 });
            return true;
        });
    }
    release() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.dbReady;
            const currentCount = yield this.getResourceCount();
            if (currentCount > 0) {
                yield this.updateResourceCount(currentCount - 1);
                this.loggingAdapter.log(`resource released. Current count: ${currentCount - 1}`);
                console.log(`resource released. Current count: ${currentCount - 1}`);
                //this.telemetryAdapter.collect({ event: 'resource_released', count: currentCount - 1 });
            }
            else {
                console.log(`no resources to release.`);
            }
        });
    }
}
exports.Semaphore = Semaphore;
