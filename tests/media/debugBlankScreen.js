const http = require('http');

http.get('http://localhost:3000/api/v1/media?limit=100', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Response format:', Object.keys(json));
      if (json.data) {
        console.log('json.data keys:', Object.keys(json.data));
        if (json.data.medias) {
          console.log('medias length:', json.data.medias.length);
          if (json.data.medias.length > 0) {
            console.log('First media:', json.data.medias[0]);
          }
        } else {
          console.log('json.data.medias is undefined! It is:', typeof json.data.medias);
        }
      }
    } catch (e) {
      console.error(e);
    }
  });
});
