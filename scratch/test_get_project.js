const https = require('https');

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d }));
    }).on('error', reject);
  });
}

async function testProject() {
  const id = 'ee80e2b2-1764-4dc8-8ece-8f88661bb245';
  const urls = [
    `https://readdy.ai/api/page_gen/project?projectId=${id}`,
    `https://readdy.ai/api/page_gen/project?id=${id}`
  ];

  for (const u of urls) {
    const res = await get(u, {
      'X-Project-Id': id,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    });
    console.log(u, res.status, res.body.substring(0, 500));
  }
}

testProject();
