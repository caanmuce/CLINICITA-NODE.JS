const http = require('http');

// Start the server
require('./server/server.js');

// Wait for server to start
setTimeout(async () => {
    console.log('Making test request...');

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/test',
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        console.log(`Status: ${res.statusCode}`);
        console.log('Headers:', res.headers);
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log('Response:', data);
            process.exit(0);
        });
    });

    req.on('error', (e) => {
        console.error('Request error:', e);
        process.exit(1);
    });

    req.end();
}, 3000);