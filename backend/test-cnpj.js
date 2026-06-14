const axios = require('axios');

axios.get('https://data-api.click/api/funcionarios.php', {
  params: {
    funcionarios: '62442259000140',
    key: 'e3721826ebc4172ca8648c3719bc6231'
  }
}).then(r => {
  console.log('STATUS:', r.status);
  console.log('RESPONSE:', JSON.stringify(r.data, null, 2));
}).catch(e => {
  console.error('ERRO:', e.message);
  if (e.response) console.error('BODY:', JSON.stringify(e.response.data));
});
