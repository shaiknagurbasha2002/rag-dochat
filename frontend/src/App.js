import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

const API = "https://rag-dochat-backend.onrender.com";

// ── Auth Page ─────────────────────────────────────────────
function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email || !password) return setError("Please fill in all fields");
    setLoading(true);
    setError("");

    try {
      let res;
      if (isLogin) {
        // Login uses form data format
        const form = new URLSearchParams();
        form.append("username", email);
        form.append("password", password);
        res = await axios.post(`${API}/auth/login`, form);
      } else {
        res = await axios.post(`${API}/auth/register`, { email, password });
      }
      onLogin(res.data.access_token, res.data.email);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.authContainer}>
      <div style={styles.authCard}>
        <h1 style={styles.authLogo}>📄 DocChat</h1>
        <p style={styles.authSub}>Ask your documents anything</p>

        <div style={styles.authToggle}>
          <button
            style={{ ...styles.toggleBtn, ...(isLogin ? styles.toggleActive : {}) }}
            onClick={() => { setIsLogin(true); setError(""); }}
          >Login</button>
          <button
            style={{ ...styles.toggleBtn, ...(!isLogin ? styles.toggleActive : {}) }}
            onClick={() => { setIsLogin(false); setError(""); }}
          >Register</button>
        </div>

        <input
          style={styles.authInput}
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          style={styles.authInput}
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
        />

        {error && <p style={styles.authError}>{error}</p>}

        <button
          style={{ ...styles.authBtn, opacity: loading ? 0.7 : 1 }}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Please wait..." : isLogin ? "Login" : "Create account"}
        </button>

        <p style={styles.authSwitch}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span
            style={styles.authLink}
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
          >
            {isLogin ? "Register" : "Login"}
          </span>
        </p>
      </div>
    </div>
  );
}

// ── Main Chat App ─────────────────────────────────────────
function ChatApp({ token, email, onLogout }) {
  const [docs, setDocs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Axios with auth header
  const api = axios.create({
    baseURL: API,
    headers: { Authorization: `Bearer ${token}` }
  });

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await api.post("/ingest", form);
      setDocs(prev => [...prev, res.data]);
      setMessages(prev => [...prev, {
        role: "system",
        content: `✅ "${res.data.file_name}" uploaded — ${res.data.chunks} chunks indexed.`
      }]);
    } catch (err) {
      alert("Upload failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    if (docs.length === 0) return alert("Please upload a PDF first!");
    const userMsg = { role: "user", content: question };
    setMessages(prev => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);
    try {
      const res = await api.post("/query", { question });
      setMessages(prev => [...prev, {
        role: "assistant",
        content: res.data.answer,
        sources: res.data.sources
      }]);
    } catch (err) {
      alert("Query failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.logo}>📄 DocChat</h2>
          <p style={styles.userEmail}>👤 {email}</p>
          <button onClick={onLogout} style={styles.logoutBtn}>Logout</button>
        </div>

        <label style={styles.uploadBtn}>
          {uploading ? "Uploading..." : "+ Upload PDF"}
          <input type="file" accept=".pdf" onChange={handleUpload}
            style={{ display: "none" }} disabled={uploading} />
        </label>

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
      </div>

      {/* CHAT PANE */}
      <div style={styles.chatPane}>
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

        <div style={styles.inputRow}>
          <input
            style={styles.input}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAsk()}
            placeholder={docs.length === 0 ? "Upload a PDF first..." : "Ask something..."}
            disabled={loading || docs.length === 0}
          />
          <button
            style={{ ...styles.sendBtn, opacity: loading || docs.length === 0 ? 0.5 : 1 }}
            onClick={handleAsk}
            disabled={loading || docs.length === 0}
          >Ask</button>
        </div>
      </div>
    </div>
  );
}

// ── Root App with Auth State ──────────────────────────────
export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [email, setEmail] = useState(localStorage.getItem("email") || "");

  const handleLogin = (newToken, userEmail) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("email", userEmail);
    setToken(newToken);
    setEmail(userEmail);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    setToken("");
    setEmail("");
  };

  if (!token) return <AuthPage onLogin={handleLogin} />;
  return <ChatApp token={token} email={email} onLogout={handleLogout} />;
}

// ── Styles ────────────────────────────────────────────────
const styles = {
  // Auth
  authContainer: { display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#f5f5f5" },
  authCard: { background:"#fff", borderRadius:16, padding:"2.5rem 2rem", width:380, boxShadow:"0 4px 24px rgba(0,0,0,0.08)", display:"flex", flexDirection:"column", gap:12 },
  authLogo: { fontSize:24, fontWeight:700, color:"#1a1a2e", textAlign:"center" },
  authSub: { fontSize:13, color:"#888", textAlign:"center", marginTop:-8 },
  authToggle: { display:"flex", background:"#f5f5f5", borderRadius:8, padding:4, gap:4 },
  toggleBtn: { flex:1, padding:"8px 0", border:"none", borderRadius:6, fontSize:13, cursor:"pointer", background:"transparent", color:"#888" },
  toggleActive: { background:"#fff", color:"#1a1a2e", fontWeight:500, boxShadow:"0 1px 4px rgba(0,0,0,0.1)" },
  authInput: { border:"1px solid #eee", borderRadius:8, padding:"10px 14px", fontSize:14, outline:"none", width:"100%" },
  authBtn: { background:"#4f8ef7", color:"#fff", border:"none", borderRadius:8, padding:"12px 0", fontSize:14, fontWeight:500, cursor:"pointer", width:"100%" },
  authError: { color:"#e24b4a", fontSize:12, textAlign:"center" },
  authSwitch: { fontSize:12, color:"#888", textAlign:"center" },
  authLink: { color:"#4f8ef7", cursor:"pointer", fontWeight:500 },
  // Chat
  container: { display:"flex", height:"100vh", background:"#f5f5f5" },
  sidebar: { width:260, background:"#1a1a2e", display:"flex", flexDirection:"column", padding:"1.5rem 1rem", gap:12 },
  sidebarHeader: { marginBottom:4 },
  logo: { color:"#fff", fontSize:20, fontWeight:600 },
  userEmail: { color:"#888", fontSize:11, marginTop:4, wordBreak:"break-all" },
  logoutBtn: { background:"transparent", border:"1px solid #333", color:"#888", borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer", marginTop:6 },
  uploadBtn: { display:"block", textAlign:"center", background:"#4f8ef7", color:"#fff", padding:"10px 0", borderRadius:8, fontSize:14, fontWeight:500, cursor:"pointer" },
  docList: { flex:1, overflowY:"auto" },
  docListLabel: { color:"#666", fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:8 },
  docItem: { display:"flex", gap:8, alignItems:"flex-start", background:"#16213e", borderRadius:8, padding:"8px 10px", marginBottom:6 },
  docName: { color:"#fff", fontSize:12, fontWeight:500, wordBreak:"break-all" },
  docChunks: { color:"#888", fontSize:11, marginTop:2 },
  chatPane: { flex:1, display:"flex", flexDirection:"column" },
  messages: { flex:1, overflowY:"auto", padding:"1.5rem" },
  emptyState: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:12 },
  emptyIcon: { fontSize:48 },
  emptyText: { color:"#888", fontSize:15 },
  msgRow: { display:"flex", marginBottom:16 },
  bubble: { maxWidth:"70%", padding:"12px 16px", borderRadius:12, fontSize:14, lineHeight:1.6 },
  userBubble: { background:"#4f8ef7", color:"#fff", borderRadius:"12px 12px 2px 12px" },
  aiBubble: { background:"#fff", color:"#1a1a2e", borderRadius:"12px 12px 12px 2px", boxShadow:"0 1px 4px rgba(0,0,0,0.08)" },
  systemBubble: { background:"#e8f5e9", color:"#2e7d32", borderRadius:8, fontSize:13 },
  sources: { marginTop:10, borderTop:"1px solid #eee", paddingTop:8 },
  sourcesSummary: { fontSize:12, color:"#888", cursor:"pointer" },
  sourceItem: { fontSize:12, color:"#888", marginTop:4 },
  inputRow: { display:"flex", gap:8, padding:"1rem 1.5rem", background:"#fff", borderTop:"1px solid #eee" },
  input: { flex:1, border:"1px solid #ddd", borderRadius:8, padding:"10px 14px", fontSize:14, outline:"none" },
  sendBtn: { background:"#4f8ef7", color:"#fff", border:"none", borderRadius:8, padding:"10px 20px", fontSize:14, fontWeight:500, cursor:"pointer" },
};