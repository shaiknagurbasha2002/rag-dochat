import os
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_chroma import Chroma
from langchain.prompts import PromptTemplate

load_dotenv()

CHROMA_PATH = "chroma_db"

def query_rag(question: str, user_id: str):
    """Searches only the current user's documents"""

    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small",
        openai_api_key=os.getenv("OPENAI_API_KEY")
    )

    # Search only THIS user's collection
    collection_name = f"user_{user_id.replace('-', '_')}_docs"

    vector_store = Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=embeddings,
        collection_name=collection_name
    )

    results = vector_store.similarity_search(question, k=5)

    if not results:
        return {
            "answer": "I couldn't find relevant information in your documents.",
            "sources": []
        }

    context = "\n\n---\n\n".join([doc.page_content for doc in results])

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

    prompt = prompt_template.format(context=context, question=question)

    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0,
        openai_api_key=os.getenv("OPENAI_API_KEY")
    )

    response = llm.invoke(prompt)

    sources = []
    for doc in results:
        file_name = doc.metadata.get("file_name", "Unknown")
        page = doc.metadata.get("page", "?")
        source = f"{file_name} — page {page + 1}"
        if source not in sources:
            sources.append(source)

    return {"answer": response.content, "sources": sources}