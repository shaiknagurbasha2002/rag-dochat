# 📄 DocChat — AI-Powered Document Q&A System

A full-stack RAG (Retrieval-Augmented Generation) application that lets users upload PDF documents and ask questions about them in natural language — with accurate answers and source citations.

🌐 **Live Demo:** [rag-dochat.vercel.app](https://rag-dochat.vercel.app)
⚙️ **API Docs:** [rag-dochat-backend.onrender.com/docs](https://rag-dochat-backend.onrender.com/docs)

---

## ✨ Features

- 🔐 **JWT Authentication** — secure register/login with per-user data isolation
- 📤 **PDF Upload** — upload multiple documents and index them instantly
- 🔍 **Semantic Search** — finds relevant content by meaning, not just keywords
- 🤖 **AI-Powered Answers** — GPT-4o-mini generates accurate, grounded responses
- 📎 **Source Citations** — every answer shows the exact page and document it came from
- 🚫 **Hallucination Prevention** — LLM answers only from retrieved context
- 👤 **Per-user Storage** — each user's documents are completely isolated

---

## 🏗️ Architecture