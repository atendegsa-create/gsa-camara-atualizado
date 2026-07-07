import http from 'http';

const req = http.request('http://localhost:3000/api/jurimetrics/compare', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer 123'
  }
}, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(`BODY: ${data.substring(0, 100)}`));
});

req.on('error', (e) => console.error(`problem with request: ${e.message}`));
req.write(JSON.stringify({
  banco_contrato: "Banco Bradesco",
  tipo_acao: "Revisional de Juros"
}));
req.end();
