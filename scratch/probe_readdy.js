const https = require('https');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d }));
    }).on('error', reject);
  });
}

async function run() {
  const projectId = 'ee80e2b2-1764-4dc8-8ece-8f88661bb245';
  const urls = [
    `https://readdy.ai/api/page_gen/project?id=${projectId}`,
    `https://readdy.ai/api/page_gen/project/${projectId}`,
    `https://readdy.ai/api/page_gen/record/share?id=${projectId}`,
    `https://readdy.ai/api/page_gen/record_data/code?id=${projectId}`,
    `https://readdy.ai/api/page_gen/session?id=${projectId}`
  ];

  for (const u of urls) {
    try {
      const res = await get(u);
      console.log(u, res.status, res.body.substring(0, 150));
    } catch (e) {
      console.log(u, e.message);
    }
  }
}

run();
