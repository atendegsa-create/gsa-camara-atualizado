const axios = require('axios');
axios.get('https://api.assinafy.com.br/v1/accounts', { headers: { "X-Api-Key": "test" } })
  .catch(e => console.log(e.response ? e.response.status + " " + JSON.stringify(e.response.data) : e.message))
  .then(res => res && console.log(res.status + " " + JSON.stringify(res.data)));
