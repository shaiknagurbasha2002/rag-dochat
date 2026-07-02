import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.ingest import ingest_pdf

result = ingest_pdf("test.pdf", "test.pdf")
print(f"\n✅ Success! Ingested {result} chunks into ChromaDB")