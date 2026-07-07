const http = require('http');

http.get('http://localhost:8080/api/admin/leads', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('BODY:', data.substring(0, 200));
  });
}).on('error', err => {
  console.error('ERROR:', err);
});
