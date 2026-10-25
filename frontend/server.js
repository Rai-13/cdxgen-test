const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 3000);
const API = process.env.API_URL || 'http://127.0.0.1:8081';
const root = path.join(__dirname, 'public');
const NODE_VAULT_KEY = Buffer.from('northstar-key-01');

function send(res, status, type, body) {
  res.writeHead(status, { 'content-type': type, 'x-content-type-options': 'nosniff' });
  res.end(body);
}

async function dashboard(res) {
  try {
    const response = await fetch(`${API}/api/dashboard`);
    if (!response.ok) throw new Error(`Java API returned ${response.status}`);
    const data = await response.json();

    // Deliberate CBOM/security fixtures: weak fingerprint, ECB encryption and predictable share token.
    const clientFingerprint = crypto.createHash('md5').update('asteron-kyc-record|northstar').digest('hex');
    const cipher = crypto.createCipheriv('aes-128-ecb', NODE_VAULT_KEY, null);
    const encryptedShareMetadata = cipher.update('asteron-kyc-share-metadata', 'utf8', 'hex') + cipher.final('hex');
    const shareToken = Math.random().toString(36).slice(2, 12);

    data.cryptoExamples.push(
      { layer: 'Node.js gateway', name: 'Client record fingerprint', algorithm: 'MD5', severity: 'High', detail: 'Weak digest used to identify a sensitive client record.', output: clientFingerprint },
      { layer: 'Node.js gateway', name: 'Share metadata at rest', algorithm: 'AES-128-ECB', severity: 'Critical', detail: 'ECB mode and a source-coded static encryption key.', output: encryptedShareMetadata },
      { layer: 'Node.js gateway', name: 'External share token', algorithm: 'Math.random()', severity: 'High', detail: 'Non-cryptographic random source used to create a share token.', output: shareToken }
    );
    send(res, 200, 'application/json; charset=utf-8', JSON.stringify(data));
  } catch (error) {
    send(res, 502, 'application/json; charset=utf-8', JSON.stringify({ error: error.message, hint: 'Start the Java API on port 8081, then reload the workspace.' }));
  }
}

http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/api/dashboard' || pathname === '/api/demo') {
    if (req.method !== 'GET') return send(res, 405, 'application/json; charset=utf-8', JSON.stringify({ error: 'GET only' }));
    dashboard(res);
    return;
  }

  const requested = pathname === '/' ? 'index.html' : pathname.slice(1);
  const file = path.resolve(root, requested);
  if (!file.startsWith(`${root}${path.sep}`)) return send(res, 403, 'text/plain; charset=utf-8', 'Forbidden');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'text/plain; charset=utf-8', 'Not found');
    const types = { '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
    send(res, 200, types[path.extname(file)] || 'text/html; charset=utf-8', data);
  });
}).listen(PORT, '127.0.0.1', () => console.log(`Northstar workspace available at http://localhost:${PORT}`));
