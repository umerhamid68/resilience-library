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
Object.defineProperty(exports, "__esModule", { value: true });
const Semaphore_1 = require("../semaphore/Semaphore");
const LoggingAdapter_1 = require("../adapters/LoggingAdapter");
const TelemetryAdapter_1 = require("../adapters/TelemetryAdapter");
const loggingAdapter = new LoggingAdapter_1.LoggingAdapter();
const telemetryAdapter = new TelemetryAdapter_1.TelemetryAdapter();
const semaphore = new Semaphore_1.Semaphore(3, './semaphoreDB', 'resource_key', loggingAdapter, telemetryAdapter);
function testSemaphore() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Starting Semaphore Test...');
        for (let i = 0; i < 5; i++) {
            try {
                console.log('In loop...');
                const acquired = yield semaphore.acquire();
                console.log(`Acquire attempt ${i + 1}: ${acquired ? 'Success' : 'Failed'}`);
            }
            catch (error) {
                console.error(`Error during acquire attempt ${i + 1}:`, error);
            }
        }
        console.log('Releasing one resource...');
        try {
            yield semaphore.release();
        }
        catch (error) {
            console.error('Error during release:', error);
        }
        try {
            const acquiredAfterRelease = yield semaphore.acquire();
            console.log(`Acquire after release: ${acquiredAfterRelease ? 'Success' : 'Failed'}`);
        }
        catch (error) {
            console.error('Error during acquire after release:', error);
        }
        try {
            const finalCount = yield semaphore['getResourceCount']();
            console.log(`Final resource count: ${finalCount}`);
        }
        catch (error) {
            console.error('Error during final resource count retrieval:', error);
        }
    });
}
testSemaphore().catch((err) => {
    console.error('Error during semaphore test:', err);
});
