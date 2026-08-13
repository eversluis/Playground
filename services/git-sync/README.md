# Git Sync Service

Writes a markdown note into a locally mounted Obsidian vault (a Git working
copy) and syncs it to the configured remote, per [issue #14](../../Roadmap.md).

## What it does

On user confirmation, `GitSyncService#saveNote` will:

1. Write the note content to `<vaultPath>/<date>-<slugified-title>.md`
   (e.g. `2025-01-15-meeting-with-john.md`).
2. `git add` the new file.
3. `git commit -m "Add note: <title>"`.
4. `git push` to the configured remote/branch.

The Obsidian client picks up the change on its next pull via the
[Obsidian Git](https://github.com/denolehov/obsidian-git) plugin configured
for auto-pull — that side is client configuration and out of scope for this
service.

## Usage

```js
const { GitSyncService } = require('./src/gitSyncService');

const gitSync = new GitSyncService({
  vaultPath: process.env.VAULT_PATH,       // path to the vault's git working copy on the VPS
  remote: process.env.GIT_REMOTE || 'origin',
  branch: process.env.GIT_BRANCH || 'main',
});

await gitSync.saveNote({
  title: 'Meeting with John',
  content: '# Meeting with John\n\n...',
});
```

The vault folder must already be a Git repository with `remote` configured
and credentials (SSH key or token) available to the backend container/process
for pushing.

## Setup

```bash
cd services/git-sync
npm install
npm test
```

## Architecture note

`voice-note-architecture.md` documents a decision to use **Git APIs only**
(no local repository cloning) for Git integration. This service instead
implements the approach specified in issue #14 (locally mounted vault +
`simple-git` commit/push), which matches the acceptance criteria there but
conflicts with that architecture decision. Worth reconciling the two before
this goes further — either update the architecture doc to reflect the
local-clone approach, or replace this service with a GitHub/GitLab API-based
implementation.
