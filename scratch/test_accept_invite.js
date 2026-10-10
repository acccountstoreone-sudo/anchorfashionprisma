const https = require('https');

function post(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ...headers
      }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function run() {
  const token = 'HAyvVyb3Y5HKl5CjYAoSNGdHK81VheTU';
  const urls = [
    'https://readdy.ai/api/project/member/invite/accept',
    'https://readdy.ai/api/project/member/invite/info'
  ];

  for (const u of urls) {
    try {
      const res = await post(u, { token, from: 'link' });
      console.log(u, res.status, res.body);
    } catch (e) {
      console.log(u, e.message);
    }
  }
}

run();
