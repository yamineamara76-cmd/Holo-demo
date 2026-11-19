/* Petit serveur statique sans dépendance pour Clever Cloud (Node.js) */
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const ROOT = __dirname, PORT = process.env.PORT || 8080;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  if (p.startsWith('/css/img/')) p = p.slice(4);   // images citées depuis la feuille de style
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT) || /server\.js$|package\.json$/.test(file)) { res.writeHead(404); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': p === '/index.html' || p === '/sw.js' ? 'no-cache' : 'public, max-age=3600' });
    res.end(data);
  });
}).listen(PORT, () => console.log('HOLO démo sur le port ' + PORT));
