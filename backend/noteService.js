const fs = require('fs');
const path = require('path');

function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'untitled-note';
}

function validateConfirmPayload(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    return ['Request body must be a JSON object'];
  }
  if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
    errors.push('title is required');
  }
  if (!body.markdown || typeof body.markdown !== 'string' || !body.markdown.trim()) {
    errors.push('markdown is required');
  }
  if (body.tags !== undefined && !Array.isArray(body.tags)) {
    errors.push('tags must be an array of strings');
  }
  return errors;
}

// Builds the final markdown file (frontmatter + body) that gets synced to Git.
function buildNoteFile({ title, tags = [], date, duration, markdown }) {
  const frontmatter = [
    '---',
    `title: "${title.replace(/"/g, '\\"')}"`,
    `date: ${date || new Date().toISOString()}`,
    `duration: ${duration != null ? duration : ''}`,
    `tags: [${tags.map((t) => `"${String(t).trim()}"`).join(', ')}]`,
    '---',
    '',
  ].join('\n');

  const filename = `${slugify(title)}.md`;
  return { filename, content: `${frontmatter}${markdown.trim()}\n` };
}

// Placeholder for real Git sync (see "Git Integration Pattern" in
// voice-note-architecture.md). Until that lands, notes are written to disk
// so the confirm flow is fully testable end to end.
function saveNote(notesDir, note) {
  fs.mkdirSync(notesDir, { recursive: true });
  const filePath = path.join(notesDir, note.filename);
  fs.writeFileSync(filePath, note.content, 'utf8');
  return filePath;
}

module.exports = { slugify, validateConfirmPayload, buildNoteFile, saveNote };
