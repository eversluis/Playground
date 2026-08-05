// Data shown here would normally come from the LLM refinement step
// (see "Note Refinement Workflow" in voice-note-architecture.md). That step
// isn't wired up yet, so this stands in for its output until it lands.
const MOCK_NOTE = {
  title: 'Sprint planning notes',
  tags: ['work', 'planning'],
  date: new Date().toISOString(),
  duration: 187,
  markdown: [
    '## Summary',
    '',
    'Discussed the upcoming sprint scope and identified two blockers.',
    '',
    '## Action Items',
    '- Follow up with design on the onboarding mockups',
    '- Confirm API contract with the backend team',
  ].join('\n'),
};

const titleInput = document.getElementById('title');
const tagsInput = document.getElementById('tags');
const dateEl = document.getElementById('date');
const durationEl = document.getElementById('duration');
const previewEl = document.getElementById('markdown-preview');
const statusEl = document.getElementById('status');
const confirmBtn = document.getElementById('confirm');
const discardBtn = document.getElementById('discard');

let currentNote = null;

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function renderNote(note) {
  currentNote = note;
  titleInput.value = note.title;
  tagsInput.value = note.tags.join(', ');
  dateEl.textContent = new Date(note.date).toLocaleString();
  durationEl.textContent = formatDuration(note.duration);
  previewEl.innerHTML = marked.parse(note.markdown);
}

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = type || '';
}

function setFormDisabled(disabled) {
  titleInput.disabled = disabled;
  tagsInput.disabled = disabled;
  confirmBtn.disabled = disabled;
  discardBtn.disabled = disabled;
}

async function handleConfirm() {
  const title = titleInput.value.trim();
  const tags = tagsInput.value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  if (!title) {
    setStatus('Title is required.', 'error');
    return;
  }

  setFormDisabled(true);
  setStatus('Syncing…');

  try {
    const response = await fetch('/api/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        tags,
        date: currentNote.date,
        duration: currentNote.duration,
        markdown: currentNote.markdown,
      }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error((result.errors || ['Sync failed']).join(', '));
    }

    setStatus(`Saved as ${result.filename}.`, 'success');
  } catch (err) {
    setStatus(err.message, 'error');
    setFormDisabled(false);
  }
}

function handleDiscard() {
  setFormDisabled(true);
  previewEl.innerHTML = '';
  setStatus('Note discarded.', '');
}

confirmBtn.addEventListener('click', handleConfirm);
discardBtn.addEventListener('click', handleDiscard);

renderNote(MOCK_NOTE);
