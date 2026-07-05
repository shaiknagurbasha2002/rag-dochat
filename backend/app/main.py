import os
import shutil
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv

from app.ingest import ingest_pdf
from app.query import query_rag

load_dotenv()

# Create the FastAPI app
app = FastAPI(
    title="RAG DocChat API",
    description="Upload PDFs and ask questions about them",
    version="1.0.0"
)

# CORS — allows React frontend to talk to this API
# Without this, the browser will block all requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://rag-dochat.vercel.app",
        "https://*.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Track uploaded documents in memory
uploaded_docs = []

# ─── Request/Response Models ───────────────────────────────

class QueryRequest(BaseModel):
    question: str

class QueryResponse(BaseModel):
    answer: str
    sources: List[str]

class DocumentInfo(BaseModel):
    file_name: str
    chunks: int

# ─── Routes ────────────────────────────────────────────────

@app.get("/")
def root():
    """Health check — visit this to confirm API is running"""
    return {"status": "running", "message": "RAG DocChat API is live!"}


@app.post("/ingest", response_model=DocumentInfo)
async def ingest_document(file: UploadFile = File(...)):
    """
    Upload a PDF file.
    Chunks it, embeds it, and stores in ChromaDB.
    """
    # Only accept PDF files
    if not file.filename.endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )

    # Save uploaded file to a temp location on disk
    # We need a real file path for PyPDFLoader
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        # Run the ingestion pipeline
        chunks = ingest_pdf(tmp_path, file.filename)

        # Track the document
        uploaded_docs.append({
            "file_name": file.filename,
            "chunks": chunks
        })

        return DocumentInfo(file_name=file.filename, chunks=chunks)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Always clean up the temp file
        os.unlink(tmp_path)


@app.post("/query", response_model=QueryResponse)
async def query_document(request: QueryRequest):
    """
    Ask a question.
    Searches ChromaDB and returns an LLM answer with citations.
    """
    if not request.question.strip():
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty"
        )

    try:
        result = query_rag(request.question)
        return QueryResponse(
            answer=result["answer"],
            sources=result["sources"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/documents", response_model=List[DocumentInfo])
async def get_documents():
    """Returns list of all uploaded documents"""
    return uploaded_docs


@app.delete("/documents")
async def clear_documents():
    """Clears all documents from ChromaDB"""
    import shutil
    if os.path.exists("chroma_db"):
        shutil.rmtree("chroma_db")
    uploaded_docs.clear()
    return {"message": "All documents cleared"}