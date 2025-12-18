from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from llm.generate import generate
from llm.config import GenerationConfig

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

class GenerateRequest(BaseModel):
    prompt: str

@app.post("/generate")
def generate_stream(req: GenerateRequest):
    gen_cfg = GenerationConfig()
    def stream_markdown():
        for chunk in generate(req.prompt, gen_cfg, stream=True):
            # SSE chuẩn
            yield chunk
    return StreamingResponse(
        stream_markdown(),
        media_type="text/event-stream"
    )