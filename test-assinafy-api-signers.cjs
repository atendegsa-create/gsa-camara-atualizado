const axios = require('axios');
axios.post('https://api.assinafy.com.br/v1/accounts/b8396c21-1254-47be-a698-c9ddc126ecbd/signers', {
  full_name: "Teste", email: "atende.gsa@gmail.com"
}, { headers: { "X-Api-Key": process.env.ASSINAFY_API_KEY || '' } }).catch(e => console.log(JSON.stringify(e.response ? e.response.data : e.message)));
