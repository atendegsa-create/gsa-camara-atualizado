import fetch from 'node-fetch';

async function run() {
  const res = await fetch('https://api.assinafy.com.br/v1/docs');
  const text = await res.text();
  const fs = await import('fs');
  fs.writeFileSync('docs.html', text);
  console.log('Saved docs.html');
}
run();
