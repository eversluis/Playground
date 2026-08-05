const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { slugify, validateConfirmPayload, buildNoteFile, saveNote } = require('../noteService');

test('slugify converts titles into filename-safe slugs', () => {
  assert.equal(slugify('Meeting Notes: Q3 Planning!'), 'meeting-notes-q3-planning');
  assert.equal(slugify('   '), 'untitled-note');
});

test('validateConfirmPayload requires title and markdown', () => {
  assert.deepEqual(validateConfirmPayload({}), ['title is required', 'markdown is required']);
  assert.deepEqual(validateConfirmPayload({ title: 'x', markdown: 'y' }), []);
  assert.deepEqual(
    validateConfirmPayload({ title: 'x', markdown: 'y', tags: 'not-an-array' }),
    ['tags must be an array of strings']
  );
});

test('buildNoteFile renders frontmatter and body', () => {
  const { filename, content } = buildNoteFile({
    title: 'Sprint Retro',
    tags: ['work', 'retro'],
    date: '2026-08-05T12:00:00.000Z',
    duration: 125,
    markdown: '## Summary\nThings went well.',
  });

  assert.equal(filename, 'sprint-retro.md');
  assert.match(content, /title: "Sprint Retro"/);
  assert.match(content, /date: 2026-08-05T12:00:00\.000Z/);
  assert.match(content, /duration: 125/);
  assert.match(content, /tags: \["work", "retro"\]/);
  assert.match(content, /## Summary\nThings went well\./);
});

test('saveNote writes the note to the given directory', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-test-'));
  const note = buildNoteFile({ title: 'Temp Note', markdown: 'body text' });

  const filePath = saveNote(tmpDir, note);

  assert.equal(filePath, path.join(tmpDir, 'temp-note.md'));
  assert.equal(fs.readFileSync(filePath, 'utf8'), note.content);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
