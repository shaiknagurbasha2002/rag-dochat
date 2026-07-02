import os
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_chroma import Chroma
from langchain.prompts import PromptTemplate

load_dotenv()

CHROMA_PATH = "chroma_db"

def query_rag(question: str):
    """
    Takes a user question, finds the most relevant
    chunks from ChromaDB, and returns an LLM answer
    with source citations.
    """

    # STEP 1 — Connect to the existing ChromaDB
    # (we already stored chunks here in ingest.py)
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small",
        openai_api_key=os.getenv("OPENAI_API_KEY")
    )

    vector_store = Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=embeddings,
        collection_name="documents"
    )

    # STEP 2 — Embed the question and find top 5
    # most similar chunks using cosine similarity
    print(f"\nSearching for: {question}")
    results = vector_store.similarity_search(question, k=5)
    print(f"Found {len(results)} relevant chunks")

    # If nothing relevant found, return early
    if not results:
        return {
            "answer": "I couldn't find any relevant information in the uploaded documents.",
            "sources": []
        }

    # STEP 3 — Build context from retrieved chunks
    # We join all chunks into one block of text
    context = "\n\n---\n\n".join([doc.page_content for doc in results])

    # STEP 4 — Build the prompt
    # The key instruction: "only use the context below"
    # This is what prevents hallucination
    prompt_template = PromptTemplate(
        input_variables=["context", "question"],
        template="""
You are a helpful assistant that answers questions based ONLY on the provided context.
If the answer is not in the context, say "I don't have enough information to answer that."
Do NOT make up any information.

Context:
{context}

Question: {question}

Answer:"""
    )

    prompt = prompt_template.format(
        context=context,
        question=question
    )

    # STEP 5 — Send to LLM and get answer
    llm = ChatOpenAI(
        model="gpt-4o-mini",  # cheap and fast, perfect for this project
        temperature=0,        # 0 = consistent, factual answers
        openai_api_key=os.getenv("OPENAI_API_KEY")
    )

    response = llm.invoke(prompt)
    answer = response.content

    # STEP 6 — Extract source citations from metadata
    sources = []
    for doc in results:
        file_name = doc.metadata.get("file_name", "Unknown")
        page = doc.metadata.get("page", "?")
        source = f"{file_name} — page {page + 1}"
        if source not in sources:
            sources.append(source)

    print(f"Answer generated with {len(sources)} sources")

    return {
        "answer": answer,
        "sources": sources
    }