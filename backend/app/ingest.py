import os
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma

# Load API key from .env file
load_dotenv()

# Where ChromaDB will save your vectors on disk
CHROMA_PATH = "chroma_db"

def ingest_pdf(file_path: str, file_name: str):
    """
    Takes a PDF file path, chunks it, embeds it,
    and stores the vectors in ChromaDB.
    """

    # STEP 1 — Load the PDF and extract text page by page
    print(f"Loading PDF: {file_name}")
    loader = PyPDFLoader(file_path)
    documents = loader.load()
    print(f"Loaded {len(documents)} pages")

    # STEP 2 — Split text into overlapping chunks
    # chunk_size=500  → each chunk is ~500 characters
    # chunk_overlap=50 → 50 characters overlap between chunks
    # so we don't lose meaning at chunk boundaries
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        length_function=len
    )
    chunks = splitter.split_documents(documents)
    print(f"Split into {len(chunks)} chunks")

    # Add the original filename to each chunk's metadata
    # This is how we show source citations later
    for chunk in chunks:
        chunk.metadata["file_name"] = file_name

    # STEP 3 — Create embeddings using OpenAI
    # text-embedding-3-small is cheap (~$0.02 per 1M tokens)
    # and accurate enough for this project
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small",
        openai_api_key=os.getenv("OPENAI_API_KEY")
    )

    # STEP 4 — Store vectors in ChromaDB
    # Chroma.from_documents() does two things:
    # 1. Converts each chunk to a vector using the embeddings model
    # 2. Saves those vectors + original text + metadata to disk
    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=CHROMA_PATH,
        collection_name="documents"
    )

    print(f"Stored {len(chunks)} chunks in ChromaDB")
    print(f"Ingestion complete for: {file_name}")
    return len(chunks)