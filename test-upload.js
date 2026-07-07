import 'dotenv/config';

async function run() {
  const urlAccounts = "https://api.assinafy.com.br/v1/accounts";
  const resAccount = await fetch(urlAccounts, { headers: { "X-Api-Key": process.env.ASSINAFY_API_KEY } });
  const acc = await resAccount.json();
  const accountId = acc.data[0].id;
  
  // Real minimal valid PDF in Base64
  const dummyBase64 = "JVBERi0xLjEKJcKlwrHDqwoKMSAwIG9iago8PAovQ3JlYXRvciAoQ2FudmEpCi9Qcm9kdWNlciAobGlicG5nKQovQ3JlYXRpb25EYXRlIChEOjIwMjQwMjIxMDUxMzUyKzAwJzAwJykKPj4KZW5kb2JqCgoyIDAgb2JqCjw8Ci9UeXBlIC9DYXRhbG9nCi9QYWdlcyAzIDAgUgo+PgplbmRvYmoKCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFs0IDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCgo0IDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMyAwIFIKL01lZGlhQm94IFswIDAgMTAgMTBdCi9Db250ZW50cyAwIDAgb2JqCjw8Ci9MZW5ndGggMAo+PgplbmRvYmoKCmV4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDEwNCAwMDAwMCBuIAowMDAwMDAwMTU0IDAwMDAwIG4gCjAwMDAwMDAyMDkgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA1Ci9Sb290IDIgMCBSCj4+CnN0YXJ0eHJlZgoyODQKJSVFT0YK";
  
  const buffer = Buffer.from(dummyBase64, 'base64');
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: 'application/pdf' }), 'test.pdf');
  
  const resDoc = await fetch(`https://api.assinafy.com.br/v1/accounts/${accountId}/documents`, {
    method: 'POST',
    headers: { "X-Api-Key": process.env.ASSINAFY_API_KEY },
    body: form
  });
  const docJson = await resDoc.json();
  
  if (docJson.status === 200 && docJson.data) {
    const documentId = docJson.data.id;
    
    // Create Signer
    const resSigner = await fetch(`https://api.assinafy.com.br/v1/accounts/${accountId}/signers`, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.ASSINAFY_API_KEY}`
        },
        body: JSON.stringify({
            full_name: "John Dove",
            email: "test.john.dove." + Date.now() + "@example.com"
        })
    });
    const signerJson = await resSigner.json();
    console.log("Signer creation API", resSigner.status, signerJson);
    const signerId = signerJson.data.id;

    // Now create assignment
    const assignRes = await fetch(`https://api.assinafy.com.br/v1/documents/${documentId}/assignments`, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.ASSINAFY_API_KEY}`
        },
        body: JSON.stringify({
            method: "virtual",
            signerIds: [signerId]
        })
    });
    console.log("Assign", assignRes.status, await assignRes.text());
  }
}
run();
