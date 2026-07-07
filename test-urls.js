import fetch from 'node-fetch';

async function testUrl(url) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer 12345'
      },
      body: JSON.stringify({
        title: "Test",
        file: { name: "test.pdf", content_base64: "dummy" },
        signers: [{ name: "Test", email: "test@example.com", auth_method: "email" }]
      })
    });
    console.log(url, "=> HTTP", res.status);
    console.log(await res.text());
  } catch (e) {
    console.log(url, "=> ERROR", e.message);
  }
}

const urls = [
  "https://api.assinafy.com.br/v1/documents/create",
  "https://api.assinafy.com.br/api/documents/create",
  "https://api.assinafy.com.br/api/v1/documents/create",
  "https://api.assinafy.com.br/document/create",
];

async function run() {
  for (const u of urls) {
    await testUrl(u);
  }
}
run();
