"""Loads and assembles the prompt chain used to drive the conversation loop.

The active prompt chain (used while asking clarifying questions) is:
SystemPrompt -> ProjectPrompt -> CustomPrompt

The export prompt chain (used once the user confirms the note) swaps
ProjectPrompt for ExportNote so the final pass focuses on formatting
rather than asking further questions.
"""

from pathlib import Path

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


class PromptChain:
    def __init__(self, prompts_dir: Path = PROMPTS_DIR):
        self._dir = Path(prompts_dir)

    def _read(self, name: str) -> str:
        path = self._dir / name
        return path.read_text().strip() if path.exists() else ""

    def active_prompt(self) -> str:
        parts = [
            self._read("SystemPrompt.md"),
            self._read("ProjectPrompt.md"),
            self._read("CustomPrompt.md"),
        ]
        return "\n\n".join(p for p in parts if p)

    def export_prompt(self) -> str:
        parts = [
            self._read("SystemPrompt.md"),
            self._read("ExportNote.md"),
            self._read("CustomPrompt.md"),
        ]
        return "\n\n".join(p for p in parts if p)
