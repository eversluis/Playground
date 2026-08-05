const http = require('http');
const fs = require('fs');
const path = require('path');
const { validateConfirmPayload, buildNoteFile, saveNote } = require('./noteService');

const NOTES_DIR = path.join(__dirname, 'notes');
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

const CONTENT_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
};

function serveStatic(req, res) {
  const requestPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(FRONTEND_DIR, requestPath);

  if (!filePath.startsWith(FRONTEND_DIR)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404).end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function handleConfirm(req, res) {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    let payload;
    try {
      payload = JSON.parse(body || '{}');
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, errors: ['Invalid JSON body'] }));
      return;
    }

    const errors = validateConfirmPayload(payload);
    if (errors.length) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, errors }));
      return;
    }

    const { title, tags, date, duration, markdown } = payload;
    const note = buildNoteFile({ title, tags, date, duration, markdown });
    const filePath = saveNote(NOTES_DIR, note);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, filename: note.filename, path: filePath }));
  });
}

function createServer() {
  return http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/api/confirm') {
      handleConfirm(req, res);
      return;
    }
    if (req.method === 'GET') {
      serveStatic(req, res);
      return;
    }
    res.writeHead(404).end('Not found');
  });
}

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  createServer().listen(PORT, () => {
    console.log(`Voice note backend listening on port ${PORT}`);
  });
}

module.exports = { createServer };
