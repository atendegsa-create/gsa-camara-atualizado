const axios = require('axios');
axios.put('https://api.assinafy.com.br/v1/documents/test/assignments/test/signers/test/resend', {}, { headers: { "X-Api-Key": "test", "Authorization": "Bearer test" } })
  .catch(e => console.log(e.response ? e.response.status + " " + JSON.stringify(e.response.data) : e.message))
  .then(res => res && console.log(res.status + " " + JSON.stringify(res.data)));
