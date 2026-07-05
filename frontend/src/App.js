import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
const API = "https://rag-dochat-backend.onrender.com";

export default function App() {
  const [docs, setDocs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Upload PDF ──────────────────────────────────────────
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const form = new FormData();
    form.append("file", file);

    try {
      const res = await axios.post(`${API}/ingest`, form);
      setDocs((prev) => [...prev, res.data]);
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: `✅ "${res.data.file_name}" uploaded — ${res.data.chunks} chunks indexed.`,
        },
      ]);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // ── Ask Question ────────────────────────────────────────
  const handleAsk = async () => {
    if (!question.trim()) return;
    if (docs.length === 0) {
      alert("Please upload a PDF first!");
      return;
    }

    const userMsg = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await axios.post(`${API}/query`, { question });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data.answer,
          sources: res.data.sources,
        },
      ]);
    } catch (err) {
      alert("Query failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Clear All ───────────────────────────────────────────
  const handleClear = async () => {
    await axios.delete(`${API}/documents`);
    setDocs([]);
    setMessages([]);
  };

  // ── UI ──────────────────────────────────────────────────
  return (
    <div style={styles.container}>

      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.logo}>📄 DocChat</h2>
          <p style={styles.logoSub}>Ask your documents anything</p>
        </div>

        <div style={styles.uploadSection}>
          <label style={styles.uploadBtn}>
            {uploading ? "Uploading..." : "+ Upload PDF"}
            <input
              type="file"
              accept=".pdf"
              onChange={handleUpload}
              style={{ display: "none" }}
              disabled={uploading}
            />
          </label>
        </div>

        <div style={styles.docList}>
          <p style={styles.docListLabel}>
            {docs.length === 0 ? "No documents yet" : `${docs.length} document(s)`}
          </p>
          {docs.map((doc, i) => (
            <div key={i} style={styles.docItem}>
              <span>📎</span>
              <div>
                <p style={styles.docName}>{doc.file_name}</p>
                <p style={styles.docChunks}>{doc.chunks} chunks indexed</p>
              </div>
            </div>
          ))}
        </div>

        {docs.length > 0 && (
          <button onClick={handleClear} style={styles.clearBtn}>
            🗑 Clear all documents
          </button>
        )}
      </div>

      {/* CHAT PANE */}
      <div style={styles.chatPane}>

        {/* Messages */}
        <div style={styles.messages}>
          {messages.length === 0 && (
            <div style={styles.emptyState}>
              <p style={styles.emptyIcon}>💬</p>
              <p style={styles.emptyText}>Upload a PDF and start asking questions</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{
              ...styles.msgRow,
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start"
            }}>
              <div style={{
                ...styles.bubble,
                ...(msg.role === "user" ? styles.userBubble :
                    msg.role === "system" ? styles.systemBubble :
                    styles.aiBubble)
              }}>
                <ReactMarkdown>{msg.content}</ReactMarkdown>

                {/* Source citations */}
                {msg.sources && msg.sources.length > 0 && (
                  <details style={styles.sources}>
                    <summary style={styles.sourcesSummary}>
                      📎 {msg.sources.length} source(s)
                    </summary>
                    {msg.sources.map((src, j) => (
                      <p key={j} style={styles.sourceItem}>• {src}</p>
                    ))}
                  </details>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={styles.msgRow}>
              <div style={styles.aiBubble}>
                <p style={{ color: "#888" }}>Searching documents...</p>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={styles.inputRow}>
          <input
            style={styles.input}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            placeholder={docs.length === 0
              ? "Upload a PDF first..."
              : "Ask something about your documents..."}
            disabled={loading || docs.length === 0}
          />
          <button
            style={{
              ...styles.sendBtn,
              opacity: loading || docs.length === 0 ? 0.5 : 1
            }}
            onClick={handleAsk}
            disabled={loading || docs.length === 0}
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────
const styles = {
  container: { display: "flex", height: "100vh", background: "#f5f5f5" },
  sidebar: { width: 260, background: "#1a1a2e", display: "flex", flexDirection: "column", padding: "1.5rem 1rem", gap: 16 },
  sidebarHeader: { marginBottom: 8 },
  logo: { color: "#fff", fontSize: 20, fontWeight: 600 },
  logoSub: { color: "#888", fontSize: 12, marginTop: 4 },
  uploadSection: { marginBottom: 8 },
  uploadBtn: { display: "block", textAlign: "center", background: "#4f8ef7", color: "#fff", padding: "10px 0", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" },
  docList: { flex: 1, overflowY: "auto" },
  docListLabel: { color: "#666", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 },
  docItem: { display: "flex", gap: 8, alignItems: "flex-start", background: "#16213e", borderRadius: 8, padding: "8px 10px", marginBottom: 6 },
  docName: { color: "#fff", fontSize: 12, fontWeight: 500, wordBreak: "break-all" },
  docChunks: { color: "#888", fontSize: 11, marginTop: 2 },
  clearBtn: { background: "transparent", border: "1px solid #333", color: "#888", borderRadius: 8, padding: "8px 0", fontSize: 12, cursor: "pointer", width: "100%" },
  chatPane: { flex: 1, display: "flex", flexDirection: "column" },
  messages: { flex: 1, overflowY: "auto", padding: "1.5rem" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: "#888", fontSize: 15 },
  msgRow: { display: "flex", marginBottom: 16 },
  bubble: { maxWidth: "70%", padding: "12px 16px", borderRadius: 12, fontSize: 14, lineHeight: 1.6 },
  userBubble: { background: "#4f8ef7", color: "#fff", borderRadius: "12px 12px 2px 12px" },
  aiBubble: { background: "#fff", color: "#1a1a1a", borderRadius: "12px 12px 12px 2px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  systemBubble: { background: "#e8f5e9", color: "#2e7d32", borderRadius: 8, fontSize: 13 },
  sources: { marginTop: 10, borderTop: "1px solid #eee", paddingTop: 8 },
  sourcesSummary: { fontSize: 12, color: "#888", cursor: "pointer" },
  sourceItem: { fontSize: 12, color: "#888", marginTop: 4 },
  inputRow: { display: "flex", gap: 8, padding: "1rem 1.5rem", background: "#fff", borderTop: "1px solid #eee" },
  input: { flex: 1, border: "1px solid #ddd", borderRadius: 8, padding: "10px 14px", fontSize: 14, outline: "none" },
  sendBtn: { background: "#4f8ef7", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 500, cursor: "pointer" },
};