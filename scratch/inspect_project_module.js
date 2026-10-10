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

async function findInProjectModule() {
  const code = await get('https://static.readdy.ai/static/index-fg2EbvSU.js');
  console.log('Project module length:', code.length);
  const apis = [...new Set(code.match(/\/api\/[a-zA-Z0-9_\-\/]+/g))];
  console.log('APIs in project module:', apis);
  
  // Look for projectId usage or fetch calls
  let idx = 0;
  while ((idx = code.indexOf('projectId', idx)) !== -1) {
    console.log('projectId at', idx, ':\n', code.substring(Math.max(0, idx - 100), idx + 250));
    idx += 20;
    if (idx > 20000) break;
  }
}

findInProjectModule();
