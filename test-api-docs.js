import fetch from 'node-fetch';
async function run() {
  const res = await fetch('https://api.assinafy.com.br/api/documents');
  console.log(res.status);
  console.log(await res.text());
}
run();
