const path = require('path');
const fs = require('fs/promises');
const { slugify } = require('./slugify');

class GitSyncService {
  constructor({ vaultPath, remote = 'origin', branch = 'main', git } = {}) {
    if (!vaultPath) {
      throw new Error('vaultPath is required');
    }

    this.vaultPath = vaultPath;
    this.remote = remote;
    this.branch = branch;
    // Lazily require simple-git so consumers that inject their own `git`
    // client (e.g. tests) don't need the dependency installed.
    this.git = git || require('simple-git').simpleGit(vaultPath);
  }

  buildFilename(title, date = new Date()) {
    const isoDate = date.toISOString().slice(0, 10);
    return `${isoDate}-${slugify(title)}.md`;
  }

  // Writes the note to the vault, commits it, and pushes to the configured
  // remote. Called once the user confirms the note is ready to save.
  async saveNote({ title, content, date }) {
    if (!title) {
      throw new Error('title is required');
    }
    if (typeof content !== 'string') {
      throw new Error('content is required');
    }

    const filename = this.buildFilename(title, date);
    const filePath = path.join(this.vaultPath, filename);

    await fs.writeFile(filePath, content, 'utf8');
    await this.git.add(filename);
    await this.git.commit(`Add note: ${title}`);
    await this.git.push(this.remote, this.branch);

    return { filename, filePath };
  }
}

module.exports = { GitSyncService };
