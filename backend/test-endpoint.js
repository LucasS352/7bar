const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3520,
  path: '/api/tenants/setup/2d6b13ee-6c9a-420b-a358-915f9364afce',
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'x-setup-pin': '1234567890'
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);
    console.log(`Body: ${data}`);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(JSON.stringify({ nomeFantasia: 'Test' }));
req.end();
