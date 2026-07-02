import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.query import query_rag

# Ask a question about your PDF
# Change this to something relevant to your test.pdf content!
question = "What is this document about?"

print(f"Question: {question}")
print("-" * 50)

result = query_rag(question)

print(f"\n📄 Answer:\n{result['answer']}")
print(f"\n📎 Sources:")
for source in result['sources']:
    print(f"   • {source}")