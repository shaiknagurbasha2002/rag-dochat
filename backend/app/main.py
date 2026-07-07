import os
import shutil
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from app.database import get_db, User
from app.auth import (
    get_current_user, create_access_token,
    register_user, verify_password
)
from app.ingest import ingest_pdf
from app.query import query_rag

load_dotenv()

app = FastAPI(title="RAG DocChat API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request/Response Models ─────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    email: str

class QueryRequest(BaseModel):
    question: str

class QueryResponse(BaseModel):
    answer: str
    sources: List[str]

class DocumentInfo(BaseModel):
    file_name: str
    chunks: int

# ── Auth Routes ─────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "running", "message": "RAG DocChat API v2.0 is live!"}

@app.post("/auth/register", response_model=TokenResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    user = register_user(request.email, request.password, db)
    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        email=user.email
    )

@app.post("/auth/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        email=user.email
    )

# ── Protected Routes ────────────────────────────────────

@app.post("/ingest", response_model=DocumentInfo)
async def ingest_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files supported")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        # Pass user_id for per-user storage
        chunks = ingest_pdf(tmp_path, file.filename, current_user.id)
        return DocumentInfo(file_name=file.filename, chunks=chunks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.unlink(tmp_path)

@app.post("/query", response_model=QueryResponse)
async def query_document(
    request: QueryRequest,
    current_user: User = Depends(get_current_user)
):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    try:
        # Pass user_id to search only their documents
        result = query_rag(request.question, current_user.id)
        return QueryResponse(answer=result["answer"], sources=result["sources"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"email": current_user.email, "id": current_user.id}