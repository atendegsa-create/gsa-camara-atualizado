import fetch from 'node-fetch';

async function run() {
  const res = await fetch('https://api.assinafy.com.br/v1/docs');
  const text = await res.text();
  const endpoints = text.match(/<code class="language-http">([^<]+)<\/code>/g) || text.match(/\/v1\/[a-zA-Z0-9_\-\/]+/g);
  console.log(new Set(endpoints));
}
run();
