import fetch from 'node-fetch';
import 'dotenv/config';

async function run() {
  const url = "https://api.assinafy.com.br/v1/accounts";
  const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${process.env.ASSINAFY_API_KEY}`,
        "X-Api-Key": process.env.ASSINAFY_API_KEY
      }
  });
  console.log(res.status, await res.text());
}
run();
