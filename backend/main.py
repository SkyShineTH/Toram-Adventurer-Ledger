from fastapi import FastAPI

app = FastAPI(title="Toram Adventurer Ledger API")


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Toram Adventurer Ledger API is running"}

