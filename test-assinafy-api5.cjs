const axios = require('axios');
axios.post('https://api.assinafy.com.br/v1/documents', {}, { headers: { "X-Api-Key": "test", "Authorization": "Bearer test" } })
  .catch(e => console.log(e.response ? e.response.status + " " + JSON.stringify(e.response.data) : e.message))
  .then(res => res && console.log(res.status + " " + JSON.stringify(res.data)));
