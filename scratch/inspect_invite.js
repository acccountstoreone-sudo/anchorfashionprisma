const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

async function inspectInviteModule() {
  const code = await get('https://static.readdy.ai/static/index-DTZ1pKme.js');
  console.log('Invite module length:', code.length);
  console.log(code);
}

inspectInviteModule();
