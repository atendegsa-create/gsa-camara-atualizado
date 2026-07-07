const axios = require('axios');
axios.get('https://api.assinafy.com.br/')
  .catch(e => console.log(e.response ? e.response.data : e.message))
  .then(res => res && console.log(res.data));
