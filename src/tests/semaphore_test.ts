import { Semaphore } from '../semaphore/Semaphore';
import { LoggingAdapter } from '../adapters/LoggingAdapter';
import { TelemetryAdapter } from '../adapters/TelemetryAdapter';

const loggingAdapter = new LoggingAdapter();
const telemetryAdapter = new TelemetryAdapter();

const semaphore = new Semaphore(3, './semaphoreDB', 'resource_key', loggingAdapter, telemetryAdapter);

async function testSemaphore() {
    console.log('Starting Semaphore Test...');
    for (let i = 0; i < 5; i++) {
        try {
            console.log('In loop...');
            const acquired = await semaphore.acquire();
            console.log(`Acquire attempt ${i + 1}: ${acquired ? 'Success' : 'Failed'}`);
        } catch (error) {
            console.error(`Error during acquire attempt ${i + 1}:`, error);
        }
    }
    console.log('Releasing one resource...');
    try {
        await semaphore.release();
    } catch (error) {
        console.error('Error during release:', error);
    }
    try {
        const acquiredAfterRelease = await semaphore.acquire();
        console.log(`Acquire after release: ${acquiredAfterRelease ? 'Success' : 'Failed'}`);
    } catch (error) {
        console.error('Error during acquire after release:', error);
    }
    try {
        const finalCount = await semaphore['getResourceCount']();
        console.log(`Final resource count: ${finalCount}`);
    } catch (error) {
        console.error('Error during final resource count retrieval:', error);
    }
}
testSemaphore().catch((err) => {
    console.error('Error during semaphore test:', err);
});
