import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../assets/components/Navbar";
import Footer from "../assets/components/Footer";
import {
  FaMessage,
  FaArrowLeft,
  FaRobot,
  FaUser,
  FaClockRotateLeft,
  FaTrashCan,
  FaSpinner,
} from "react-icons/fa6";

interface ChatSession {
  sessionId: string;
  question: string;
  files: string[];
  createdAt: number;
  messageCount: number;
}

export default function ChatHistoryPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [conversation, setConversation] = useState<any[]>([]);
  const [loadingConv, setLoadingConv] = useState(false);
  const [savedSessions, setSavedSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("simucfo_sessions");
    if (stored) {
      try {
        setSavedSessions(JSON.parse(stored));
      } catch {}
    }
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/sessions`);
      if (res.ok) {
        const json = await res.json();
        setSessions(json.sessions || []);
      }
    } catch {
      // Server might not be running, use local storage
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (sessionId: string) => {
    setSelectedSession(sessionId);
    setLoadingConv(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/sessions/${sessionId}`);
      if (res.ok) {
        const json = await res.json();
        setConversation(json.session?.conversation || []);
      } else {
        setConversation([]);
      }
    } catch {
      setConversation([]);
    } finally {
      setLoadingConv(false);
    }
  };

  const saveToLocalStorage = (s: ChatSession) => {
    const existing = JSON.parse(localStorage.getItem("simucfo_sessions") || "[]");
    if (!existing.find((e: any) => e.sessionId === s.sessionId)) {
      existing.unshift(s);
      localStorage.setItem("simucfo_sessions", JSON.stringify(existing.slice(0, 20)));
      setSavedSessions(existing.slice(0, 20));
    }
  };

  const clearHistory = () => {
    localStorage.removeItem("simucfo_sessions");
    setSavedSessions([]);
    setSelectedSession(null);
    setConversation([]);
  };

  const allSessions = [...sessions, ...savedSessions.filter(
    s => !sessions.find(s2 => s2.sessionId === s.sessionId)
  )];

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] dark:bg-dark-950 font-sans flex flex-col">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200 rounded-full blur-[120px] opacity-30 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[35%] h-[50%] bg-[#8c52ff] rounded-tl-[150px] z-0 pointer-events-none opacity-10 dark:opacity-5" />

      <Navbar />

      <main className="flex-grow px-[5%] py-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
            <div>
              <div className="inline-block px-4 py-1.5 mb-4 border border-[#8c52ff] rounded-full text-[#8c52ff] dark:text-[#a78bfa] font-semibold text-sm tracking-wide bg-white dark:bg-dark-900 shadow-sm">
                CHAT HISTORY
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-[#1a1a1a] dark:text-white">
                Conversation <span className="text-[#8c52ff]">History</span>
              </h1>
              <p className="text-gray-500 dark:text-dark-400 mt-4 text-lg max-w-2xl">
                Browse past analysis sessions and follow-up conversations.
              </p>
            </div>
            <div className="flex gap-3">
              {allSessions.length > 0 && (
                <button onClick={clearHistory}
                  className="bg-white dark:bg-dark-900 border-2 border-red-300 text-red-500 px-6 py-3 rounded-full font-bold text-sm hover:bg-red-50 transition-all flex items-center gap-2"
                >
                  <FaTrashCan /> Clear History
                </button>
              )}
              <button onClick={() => navigate("/product")}
                className="bg-white dark:bg-dark-900 border-2 border-[#8c52ff] text-[#8c52ff] px-8 py-3 rounded-full font-bold text-lg hover:bg-purple-50 transition-all flex items-center gap-2"
              >
                <FaArrowLeft /> New Analysis
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
            {/* Sessions List */}
            <div className="bg-white dark:bg-dark-900 p-6 rounded-[30px] shadow-sm border border-purple-50 dark:border-dark-700">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-[#8c52ff]">
                  <FaClockRotateLeft />
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Recent Sessions</h2>
                {loading && <FaSpinner className="animate-spin text-gray-400 ml-2" />}
              </div>

              {allSessions.length === 0 && !loading && (
                <div className="text-center py-12">
                  <FaMessage className="text-4xl text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No sessions yet. Run your first analysis to get started.</p>
                </div>
              )}

              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {allSessions.map((s, i) => (
                  <button
                    key={s.sessionId || i}
                    onClick={() => {
                      loadConversation(s.sessionId);
                      saveToLocalStorage(s);
                    }}
                    className={`w-full text-left p-4 rounded-[20px] border transition-all ${
                      selectedSession === s.sessionId
                        ? "bg-purple-50 dark:bg-purple-900/20 border-[#8c52ff]"
                        : "bg-gray-50 dark:bg-dark-800/50 border-gray-100 dark:border-dark-700 hover:border-[#8c52ff]/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 dark:text-white truncate">
                          {s.question || "General Analysis"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {s.files?.length || 0} file{s.files?.length !== 1 ? "s" : ""} · {s.messageCount || 0} message{(s.messageCount || 0) !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {s.createdAt ? formatDate(s.createdAt) : ""}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Conversation View */}
            <div className="bg-white dark:bg-dark-900 p-6 rounded-[30px] shadow-sm border border-purple-50 dark:border-dark-700">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-[#8c52ff]">
                  <FaMessage />
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  {selectedSession ? "Conversation" : "Select a Session"}
                </h2>
              </div>

              {!selectedSession && (
                <div className="text-center py-12">
                  <FaMessage className="text-4xl text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Select a session from the left to view its conversation.</p>
                </div>
              )}

              {loadingConv && (
                <div className="flex items-center justify-center py-12">
                  <FaSpinner className="animate-spin text-[#8c52ff] text-2xl" />
                </div>
              )}

              {selectedSession && !loadingConv && (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                  {conversation.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-8">No messages in this session.</p>
                  )}
                  {conversation.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 whitespace-pre-wrap leading-relaxed text-sm ${
                        msg.role === "user"
                          ? "bg-[#8c52ff] text-white rounded-br-md"
                          : "bg-gray-100 dark:bg-dark-800 text-gray-800 dark:text-dark-200 rounded-bl-md"
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          {msg.role === "user" ? <FaUser className="text-[10px]" /> : <FaRobot className="text-[10px]" />}
                          <span className="text-[10px] font-bold opacity-70 uppercase tracking-wider">{msg.role}</span>
                        </div>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
