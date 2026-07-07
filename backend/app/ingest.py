import os
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma

load_dotenv()

CHROMA_PATH = "chroma_db"

def ingest_pdf(file_path: str, file_name: str, user_id: str):
    """Ingests PDF into user's own ChromaDB collection"""

    print(f"Loading PDF: {file_name} for user: {user_id}")
    loader = PyPDFLoader(file_path)
    documents = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        length_function=len
    )
    chunks = splitter.split_documents(documents)

    for chunk in chunks:
        chunk.metadata["file_name"] = file_name
        chunk.metadata["user_id"] = user_id

    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small",
        openai_api_key=os.getenv("OPENAI_API_KEY")
    )

    # Each user gets their own collection — data isolation!
    collection_name = f"user_{user_id.replace('-', '_')}_docs"

    Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=CHROMA_PATH,
        collection_name=collection_name
    )

    print(f"Stored {len(chunks)} chunks for user {user_id}")
    return len(chunks)