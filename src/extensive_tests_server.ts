import express from 'express';

const app = express();
const port = 3000;

app.get('/data', (req, res) => {
    const shouldFail = Math.random() < 0.2; // 20% chance of failure
    if (shouldFail) {
        res.status(500).send('Internal Server Error');
    } else {
        res.send({ message: 'Success', timestamp: new Date() });
    }
});

app.listen(port, () => {
    console.log(`HTTP server running on port ${port}`);
});
