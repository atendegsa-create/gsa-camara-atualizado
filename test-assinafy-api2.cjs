const axios = require('axios');
axios.post('https://api.assinafy.com.br/api/v1/documents', {})
  .catch(e => console.log(e.response ? e.response.data : e.message));
