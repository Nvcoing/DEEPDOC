from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
import shutil
from typing import List

from llm.generate import generate
from llm.config import GenerationConfig
from handler.prompt import summarize

app = FastAPI(
    title="Document QA Agent",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "Collections"
os.makedirs(UPLOAD_DIR, exist_ok=True)

class GenerateRequest(BaseModel):
    prompt: str
    file_name: str

@app.post("/generate")
def generate_stream(req: GenerateRequest):
    gen_cfg = GenerationConfig()
    return StreamingResponse(
        generate(summarize(req.prompt, req.file_name), gen_cfg, stream=True),
        media_type="text/event-stream"
    )
@app.post("/files")
async def upload_file(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "message": "Uploaded successfully",
        "filename": file.filename
    }
