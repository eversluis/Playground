const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createServer } = require('../server');

const NOTES_DIR = path.join(__dirname, '..', 'notes');

function withServer(fn) {
  const server = createServer();
  return new Promise((resolve, reject) => {
    server.listen(0, async () => {
      try {
        const { port } = server.address();
        await fn(`http://127.0.0.1:${port}`);
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        server.close();
      }
    });
  });
}

test.after(() => {
  fs.rmSync(NOTES_DIR, { recursive: true, force: true });
});

test('POST /api/confirm saves a valid note', () =>
  withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Integration Test Note',
        tags: ['test'],
        date: '2026-08-05T00:00:00.000Z',
        duration: 42,
        markdown: '## Hello\nWorld',
      }),
    });

    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.success, true);
    assert.equal(result.filename, 'integration-test-note.md');
    assert.equal(fs.existsSync(result.path), true);
  }));

test('POST /api/confirm rejects a payload missing required fields', () =>
  withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const result = await response.json();
    assert.equal(response.status, 400);
    assert.equal(result.success, false);
    assert.deepEqual(result.errors, ['title is required', 'markdown is required']);
  }));

test('GET / serves the frontend index page', () =>
  withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/`);
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.match(body, /Review your note/);
  }));
