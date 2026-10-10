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

async function checkPaths() {
  const id = 'ee80e2b2-1764-4dc8-8ece-8f88661bb245';
  const paths = [
    `https://readdy.ai/preview/${id}`,
    `https://readdy.ai/share/${id}`,
    `https://readdy.ai/site/${id}`,
    `https://readdy.ai/p/${id}`,
    `https://readdy.ai/api/public/project/${id}`,
    `https://readdy.ai/api/public/project?id=${id}`,
    `https://readdy.ai/api/page_gen/project/share?id=${id}`,
    `https://readdy.ai/api/page_gen/share/${id}`
  ];

  for (const p of paths) {
    const res = await get(p);
    console.log(p, res.status, res.headers.location || '', res.body.substring(0, 100));
  }
}

checkPaths();
