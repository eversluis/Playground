const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { GitSyncService } = require('../src/gitSyncService');

function createFakeGit() {
  const calls = [];
  return {
    calls,
    async add(file) {
      calls.push(['add', file]);
    },
    async commit(message) {
      calls.push(['commit', message]);
    },
    async push(remote, branch) {
      calls.push(['push', remote, branch]);
    },
  };
}

test('buildFilename formats date and slugified title', () => {
  const service = new GitSyncService({ vaultPath: '/tmp/vault', git: createFakeGit() });
  const filename = service.buildFilename('Meeting with John!', new Date('2025-01-15T10:00:00Z'));
  assert.equal(filename, '2025-01-15-meeting-with-john.md');
});

test('constructor requires a vaultPath', () => {
  assert.throws(() => new GitSyncService({ git: createFakeGit() }), /vaultPath is required/);
});

test('saveNote rejects a missing title', async () => {
  const service = new GitSyncService({ vaultPath: '/tmp/vault', git: createFakeGit() });
  await assert.rejects(
    () => service.saveNote({ content: 'body' }),
    /title is required/
  );
});

test('saveNote writes the file, commits, and pushes in order', async (t) => {
  const vaultPath = await fs.mkdtemp(path.join(os.tmpdir(), 'vault-'));
  t.after(() => fs.rm(vaultPath, { recursive: true, force: true }));

  const git = createFakeGit();
  const service = new GitSyncService({ vaultPath, remote: 'origin', branch: 'main', git });

  const result = await service.saveNote({
    title: 'Meeting with John',
    content: '# Meeting with John\n\nNotes here.',
    date: new Date('2025-01-15T10:00:00Z'),
  });

  assert.equal(result.filename, '2025-01-15-meeting-with-john.md');
  assert.equal(result.filePath, path.join(vaultPath, '2025-01-15-meeting-with-john.md'));

  const written = await fs.readFile(result.filePath, 'utf8');
  assert.equal(written, '# Meeting with John\n\nNotes here.');

  assert.deepEqual(git.calls, [
    ['add', '2025-01-15-meeting-with-john.md'],
    ['commit', 'Add note: Meeting with John'],
    ['push', 'origin', 'main'],
  ]);
});
