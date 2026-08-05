from fastapi import FastAPI

app = FastAPI(title="ArchStudio Backend")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/")
def root():
    return {"message": "ArchStudio backend placeholder — replace with the real application"}
