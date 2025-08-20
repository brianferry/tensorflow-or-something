const http = require('http');

const postData = JSON.stringify({
    "task": "How does Pikachu matchup versus Rhyhorn in competitive Pokemon?",
    "mode": "quality"
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/run_task/',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const result = JSON.parse(data);
            console.log(result.result);
        } catch (e) {
            console.log('Raw response:', data);
        }
    });
});

req.on('error', (e) => {
    console.error(`Request error: ${e.message}`);
});

req.write(postData);
req.end();
