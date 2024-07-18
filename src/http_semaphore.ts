import { Semaphore } from './Semaphore';
import axios from 'axios';

const semaphore = Semaphore.create('resource_key',3);

async function makeRequest() {
    try {
        await semaphore.execute(async () => {
            const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1');
            console.log(response.data);
        });
    } catch (error) {
        const er = error as Error;
        console.error('Request failed:', er.message);
    }
}

makeRequest();
