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

async function search() {
  const code = await get('https://static.readdy.ai/static/index-CFOUNqjx.js');
  const regex = /([a-zA-Z0-9_$]+)\s*=\s*(async\s*)?\([^)]*\)\s*=>[^{]*\/api\/[a-zA-Z0-9_\-\/]*invite/g;
  let m;
  while ((m = regex.exec(code)) !== null) {
    console.log(m[0]);
  }

  // Also search for /invite
  let idx = 0;
  while ((idx = code.indexOf('/invite', idx)) !== -1) {
    console.log('Invite at', idx, ':\n', code.substring(Math.max(0, idx - 50), idx + 150));
    idx += 7;
  }
}

search();
