const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const formData = new FormData();
formData.append('file', Buffer.from('test'), { filename: 'test.pdf', contentType: 'application/pdf' });

axios.post('https://api.assinafy.com.br/v1/accounts/test/documents', formData, {
  headers: {
    "X-Api-Key": "test",
    ...formData.getHeaders()
  }
}).catch(e => console.log(e.response ? e.response.status + " " + JSON.stringify(e.response.data) : e.message))
  .then(res => res && console.log(res.status + " " + JSON.stringify(res.data)));
