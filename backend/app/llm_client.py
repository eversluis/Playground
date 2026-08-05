"""Minimal LLM client abstraction supporting OpenAI, Anthropic, and Groq.

Each client sends a plain REST request so the module only depends on
`requests`, not on any provider SDK. Provider and credentials are selected
via environment variables at call time (see get_llm_client()).
"""

import os

import requests


class LLMClient:
    def chat(self, messages: list) -> str:
        raise NotImplementedError


class OpenAIClient(LLMClient):
    def __init__(self, api_key: str, model: str = "gpt-4o"):
        self._api_key = api_key
        self._model = model

    def chat(self, messages: list) -> str:
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {self._api_key}"},
            json={"model": self._model, "messages": messages},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


class AnthropicClient(LLMClient):
    def __init__(self, api_key: str, model: str = "claude-sonnet-5"):
        self._api_key = api_key
        self._model = model

    def chat(self, messages: list) -> str:
        system = next((m["content"] for m in messages if m["role"] == "system"), None)
        turns = [m for m in messages if m["role"] != "system"]
        resp = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": self._api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": self._model,
                "system": system,
                "messages": turns,
                "max_tokens": 1024,
            },
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["content"][0]["text"]


class GroqClient(LLMClient):
    def __init__(self, api_key: str, model: str = "llama-3.3-70b-versatile"):
        self._api_key = api_key
        self._model = model

    def chat(self, messages: list) -> str:
        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {self._api_key}"},
            json={"model": self._model, "messages": messages},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


def get_llm_client() -> LLMClient:
    provider = os.environ.get("LLM_PROVIDER", "openai").lower()
    if provider == "openai":
        return OpenAIClient(
            api_key=os.environ["OPENAI_API_KEY"],
            model=os.environ.get("OPENAI_MODEL", "gpt-4o"),
        )
    if provider == "anthropic":
        return AnthropicClient(
            api_key=os.environ["ANTHROPIC_API_KEY"],
            model=os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5"),
        )
    if provider == "groq":
        return GroqClient(
            api_key=os.environ["GROQ_API_KEY"],
            model=os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
        )
    raise ValueError(f"Unknown LLM_PROVIDER: {provider!r}")
