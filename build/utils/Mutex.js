"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mutex = void 0;
class Mutex {
    constructor() {
        this.mutex = Promise.resolve();
    }
    lock() {
        let begin = (unlock) => { };
        this.mutex = this.mutex.then(() => {
            return new Promise(begin);
        });
        return new Promise((res) => {
            begin = () => {
                res(() => {
                    this.mutex = Promise.resolve();
                });
            };
        });
    }
}
exports.Mutex = Mutex;
