import fetch from 'node-fetch';

import * as dotenv from 'dotenv';
dotenv.config();

async function testParam(url, payload) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.ASSINAFY_API_KEY
      },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log(res.status, text);
  } catch (e) {
    console.error(e.message);
  }
}

async function runTests() {
  if (!process.env.ASSINAFY_API_KEY) {
      console.log("No API Key");
      return;
  }
  const url = "https://api.assinafy.com.br/v1/documents";
  const dummyBase64 = "JVBERi0xLjEKJcKlwrHDqwoKMSAwIG9iago8PAovQ3JlYXRvciAoQ2FudmEpCi9Qcm9kdWNlciAobGlicG5nKQovQ3JlYXRpb25EYXRlIChEOjIwMjQwMjIxMDUxMzUyKzAwJzAwJykKPj4KZW5kb2JqCgoyIDAgb2JqCjw8Ci9UeXBlIC9DYXRhbG9nCi9QYWdlcyAzIDAgUgo+PgplbmRvYmoKCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFs0IDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCgo0IDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMyAwIFIKL01lZGlhQm94IFswIDAgMTAgMTBdCi9Db250ZW50cyAwIDAgb2JqCjw8Ci9MZW5ndGggMAo+PgplbmRvYmoKCmV4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDEwNCAwMDAwMCBuIAowMDAwMDAwMTU0IDAwMDAwIG4gCjAwMDAwMDAyMDkgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA1Ci9Sb290IDIgMCBSCj4+CnN0YXJ0eHJlZgoyODQKJSVFT0YK";

  console.log("Test 1:");
  await testParam(url, {
    title: "Test doc",
    file_name: "test.pdf",
    file_base64: dummyBase64,
    signers: [{name: "A", email: "atende.gsa@gmail.com", auth_method: "email"}]
  });

  console.log("Test 2:");
  await testParam(url, {
    title: "Test doc",
    file_name: "test.pdf",
    content_base64: dummyBase64,
    signers: [{name: "A", email: "atende.gsa@gmail.com", auth_method: "email"}]
  });

  console.log("Test 3:");
  await testParam(url, {
    title: "Test doc",
    file_base64: dummyBase64,
    signers: [{name: "A", email: "atende.gsa@gmail.com", auth_method: "email"}]
  });

  console.log("Test 4:");
  await testParam(url, {
    title: "Test doc",
    file: { name: "test.pdf", content_base64: dummyBase64 },
    signers: [{name: "A", email: "atende.gsa@gmail.com", auth_method: "email"}]
  });
}
runTests();
