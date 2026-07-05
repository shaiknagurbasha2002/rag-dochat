import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.query import query_rag

# List of multiple questions to test the pipeline thoroughly
questions = [
    "What is this document about?",
    "What documents are required for the application?",
    "Are there any special requirements for students?",
    "What is the process for submitting the application?",
    "What happens after the application is submitted?"
]

print("=" * 60)
print("RAG PIPELINE — END TO END TEST")
print("=" * 60)

for i, question in enumerate(questions, 1):
    print(f"\n🔹 Question {i}: {question}")
    print("-" * 50)

    result = query_rag(question)

    print(f"📄 Answer:\n{result['answer']}")
    print(f"\n📎 Sources:")
    for source in result['sources']:
        print(f"   • {source}")
    print("=" * 60)

print("\n✅ All tests complete!")