from fastapi import FastAPI

from .api import router as conversation_router

app = FastAPI(title="Voice Note Conversation Service")
app.include_router(conversation_router)
