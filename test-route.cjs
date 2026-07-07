const axios = require('axios');
axios.post('http://localhost:3000/api/recovery/criar-assinatura', {}).catch(e => {
  if (e.response) console.log(e.response.data);
  else console.log(e.message);
});
