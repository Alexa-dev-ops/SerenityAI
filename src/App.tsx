import React, { useState, useEffect, useRef } from "react";
import { 
  LineChart as ReLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { 
  Heart, 
  MessageCircle, 
  LineChart, 
  BookOpen, 
  AlertCircle, 
  Plus, 
  Send, 
  ChevronRight, 
  ShieldAlert, 
  User,
  LogOut,
  Zap,
  CheckCircle2,
  X,
  Moon,
  Sun,
  Settings
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { cn } from "./lib/utils";
import { getChatResponse, predictRelapseRisk } from "./services/geminiService";

// --- Types ---
type View = "landing" | "auth" | "dashboard" | "chat" | "checkin" | "journal" | "resources" | "emergency" | "admin" | "admin-login";

interface MoodEntry {
  id: number;
  mood: number;
  urgeLevel: number;
  timestamp: string;
}

interface JournalEntry {
  id: number;
  content: string;
  sentiment: string;
  timestamp: string;
}

interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
  sober_start_date: string;
}

// --- Components ---

const Sidebar = ({ activeView, setView, isAdmin, darkMode, toggleDarkMode, onLogout }: { 
  activeView: View; 
  setView: (v: View) => void; 
  isAdmin: boolean;
  darkMode: boolean;
  toggleDarkMode: () => void;
  onLogout: () => void;
}) => {
  const menuItems = [
    { id: "dashboard", icon: LineChart, label: "Dashboard" },
    { id: "chat", icon: MessageCircle, label: "AI Support" },
    { id: "checkin", icon: Plus, label: "Check-in" },
    { id: "journal", icon: BookOpen, label: "Journal" },
    { id: "resources", icon: ShieldAlert, label: "Resources" },
    { id: "emergency", icon: AlertCircle, label: "Emergency", color: "text-black" },
  ];

  return (
    <div className="w-64 h-screen bg-brand-50 border-r border-brand-200 text-brand-900 p-6 flex flex-col fixed left-0 top-0 z-50 transition-colors duration-300">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-900 rounded-full flex items-center justify-center">
            <Heart className="text-brand-50" size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight uppercase">Serenity</h1>
        </div>
        <button 
          onClick={toggleDarkMode}
          className="p-2 hover:bg-brand-100 rounded-sm transition-colors text-brand-500 hover:text-brand-900"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
      
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as View)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-sm transition-all duration-200 text-sm",
              activeView === item.id 
                ? "bg-accent text-white font-medium" 
                : "text-brand-500 hover:bg-brand-100 hover:text-brand-900"
            )}
          >
            <item.icon size={18} className={item.color} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="pt-6 border-t border-brand-200 space-y-1">
        <button 
          onClick={() => setView(isAdmin ? "admin" : "admin-login")}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors rounded-sm",
            activeView === "admin" || activeView === "admin-login"
              ? "bg-accent text-white"
              : "text-brand-400 hover:text-brand-900 hover:bg-brand-100"
          )}
        >
          <Settings size={18} />
          <span>{isAdmin ? "Admin Panel" : "Admin Login"}</span>
        </button>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-brand-400 hover:text-black hover:bg-red-50 transition-colors rounded-sm"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

const MoodTrends = ({ moods }: { moods: MoodEntry[] }) => {
  const data = [...moods].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(m => ({
      date: new Date(m.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      mood: m.mood,
      urge: m.urgeLevel
    }));

  return (
    <div className="bg-brand-50 border border-brand-200 p-8 card-shadow h-[400px]">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-400">Longitudinal Analysis</h3>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-brand-900" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-brand-400">Mood</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-brand-400">Urge</span>
          </div>
        </div>
      </div>
      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ReLineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: 'monospace' }} 
              dy={10}
            />
            <YAxis 
              domain={[0, 5]} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: 'monospace' }} 
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #141414', borderRadius: '0px', fontSize: '12px' }}
              itemStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}
              cursor={{ stroke: '#141414', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Line 
              type="monotone" 
              dataKey="mood" 
              stroke="#141414" 
              strokeWidth={2} 
              dot={{ r: 3, fill: '#141414', strokeWidth: 0 }} 
              activeDot={{ r: 5, strokeWidth: 0 }} 
              name="Mood"
              animationDuration={1500}
            />
            <Line 
              type="monotone" 
              dataKey="urge" 
              stroke="#F27D26" 
              strokeWidth={2} 
              dot={{ r: 3, fill: '#F27D26', strokeWidth: 0 }} 
              activeDot={{ r: 5, strokeWidth: 0 }} 
              name="Urge"
              animationDuration={1500}
            />
          </ReLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const Dashboard = ({ moods, journals, risk, user }: { moods: MoodEntry[], journals: JournalEntry[], risk: any, user: UserData | null }) => {
  const calculateSoberDays = () => {
    if (!user || !user.sober_start_date) return 0;
    const diff = new Date().getTime() - new Date(user.sober_start_date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return isNaN(days) ? 0 : Math.max(0, days);
  };

  const soberDays = calculateSoberDays();

  return (
    <div className="space-y-12">
      <header className="border-b border-brand-900 pb-8">
        <h2 className="text-4xl font-bold tracking-tighter uppercase text-brand-900">Overview</h2>
        <p className="text-brand-500 text-sm mt-2 font-mono uppercase tracking-widest">Status: Active / Day {soberDays}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Risk Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-2 bg-brand-50 border border-brand-200 p-8 card-shadow"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-400">Relapse Risk Analysis</h3>
            <span className={cn(
              "px-3 py-0.5 border text-[10px] font-bold uppercase tracking-widest",
              risk.riskLevel === "Low" ? "border-accent bg-accent text-white" :
              risk.riskLevel === "Moderate" ? "border-brand-400 text-brand-600" :
              "border-brand-900 bg-brand-900 text-white"
            )}>
              {risk.riskLevel || "Calculating"}
            </span>
          </div>
          <p className="text-lg text-brand-900 mb-8 leading-relaxed font-medium">
            {risk.explanation || "System is currently aggregating recent behavioral data points to establish a baseline risk profile."}
          </p>
          <div className="pt-6 border-t border-brand-100 flex gap-4 items-start">
            <Zap className="text-accent shrink-0 mt-1" size={16} />
            <div>
              <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mb-1">Protocol Recommendation</p>
              <p className="text-sm text-brand-700 italic">{risk.recommendation || "Maintain current check-in frequency for optimal data accuracy."}</p>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-accent text-white p-8 flex flex-col justify-between"
        >
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50 mb-6">Sober Streak</h3>
            <div className="text-7xl font-bold tracking-tighter mb-2">{soberDays}</div>
            <p className="text-white/40 text-[10px] uppercase tracking-[0.3em]">Consecutive Days</p>
          </div>
          <div className="pt-6 border-t border-white/10">
            <p className="text-xs text-white/60 font-mono italic">"Resilience is built in silence."</p>
          </div>
        </motion.div>
      </div>

      {/* Mood Trends Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <MoodTrends moods={moods} />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Recent Moods */}
        <div className="bg-brand-50 border border-brand-200 p-8 card-shadow">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-400 mb-8">Biometric Trends</h3>
          <div className="space-y-6">
            {moods.slice(0, 5).map((m) => (
              <div key={m.id} className="flex items-center justify-between py-3 border-b border-brand-50 last:border-0">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 border border-accent flex items-center justify-center text-accent text-xs font-bold">
                    {m.mood === 1 ? "😢" : m.mood === 2 ? "😕" : m.mood === 3 ? "😐" : m.mood === 4 ? "🙂" : "😊"}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-900">Entry #{m.id}</p>
                    <p className="text-[10px] text-brand-400 font-mono">{new Date(m.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-brand-900 uppercase tracking-widest">Urge: {m.urgeLevel}/5</p>
                </div>
              </div>
            ))}
            {moods.length === 0 && <p className="text-brand-300 text-xs italic text-center py-4">No data points recorded.</p>}
          </div>
        </div>

        {/* Recent Journal */}
        <div className="bg-brand-50 border border-brand-200 p-8 card-shadow">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-400 mb-8">Cognitive Logs</h3>
          <div className="space-y-6">
            {journals.slice(0, 3).map((j) => (
              <div key={j.id} className="p-5 bg-brand-100 border border-brand-200">
                <p className="text-sm text-brand-800 line-clamp-2 mb-3 italic font-serif leading-relaxed">"{j.content}"</p>
                <div className="flex justify-between items-center pt-3 border-t border-brand-200/50">
                  <span className="text-[9px] uppercase tracking-widest font-bold text-brand-400">{new Date(j.timestamp).toLocaleDateString()}</span>
                  <span className="text-[9px] uppercase tracking-widest font-bold text-brand-900">{j.sentiment}</span>
                </div>
              </div>
            ))}
            {journals.length === 0 && <p className="text-brand-300 text-xs italic text-center py-4">No logs available.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const AIChat = ({ token }: { token: string | null }) => {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    { role: "assistant", content: "Hello, I am Serenity. State your current emotional status or request support." }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !token) return;
    
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsTyping(true);

    const response = await getChatResponse(userMsg, messages, token);
    setMessages(prev => [...prev, { role: "assistant", content: response }]);
    setIsTyping(false);
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-brand-50 border border-brand-200 card-shadow overflow-hidden">
      <div className="p-6 border-b border-brand-200 bg-brand-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-accent flex items-center justify-center text-white">
            <Heart size={20} />
          </div>
          <div>
            <h3 className="font-bold uppercase tracking-tighter text-lg text-brand-900">Serenity AI</h3>
            <p className="text-[10px] uppercase tracking-[0.2em] text-brand-500">Support Protocol Active</p>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8">
        {messages.map((m, i) => (
          <div key={i} className={cn(
            "flex",
            m.role === "user" ? "justify-end" : "justify-start"
          )}>
            <div className={cn(
              "max-w-[85%] px-6 py-4 text-sm leading-relaxed",
              m.role === "user" 
                ? "bg-accent text-white" 
                : "bg-brand-100 text-brand-900 border border-brand-200"
            )}>
              <div className={cn(
                "prose prose-sm max-w-none",
                // FIX FOR MARKDOWN TEXT:
                m.role === "user" ? "prose-invert [&_p]:text-brand-50" : "prose-brand"
              )}>
                <ReactMarkdown>
                  {m.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-brand-100 px-6 py-4 border border-brand-200">
              <div className="flex gap-1.5">
                <div className="w-1 h-1 bg-brand-900 rounded-full animate-pulse" />
                <div className="w-1 h-1 bg-brand-900 rounded-full animate-pulse [animation-delay:0.2s]" />
                <div className="w-1 h-1 bg-brand-900 rounded-full animate-pulse [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-brand-200">
        <div className="flex gap-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Input message..."
            className="flex-1 bg-brand-100 border border-brand-200 px-6 py-3 focus:outline-none focus:border-brand-900 transition-all font-mono text-xs text-brand-900"
          />
          <button 
            onClick={handleSend}
            className="w-12 h-12 bg-brand-900 text-white flex items-center justify-center hover:bg-brand-800 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const CheckIn = ({ onComplete, token }: { onComplete: () => void, token: string | null }) => {
  const [mood, setMood] = useState(3);
  const [urge, setUrge] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const moodEmojis = ["😢", "😕", "😐", "🙂", "😊"];

  const handleSubmit = async () => {
    if (!token) return;
    setSubmitting(true);
    await fetch("/api/checkin", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ mood, urgeLevel: urge })
    });
    setSubmitting(false);
    onComplete();
  };

  return (
    <div className="max-w-xl mx-auto bg-brand-50 border border-brand-200 p-12 card-shadow">
      <h2 className="text-2xl font-bold text-brand-900 mb-10 text-center uppercase tracking-tighter">Daily Check-in</h2>
      
      <div className="space-y-16">
        <section>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-8 text-center text-brand-400">Current Emotional State</h3>
          <div className="flex justify-between items-center px-4">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                onClick={() => setMood(val)}
                className={cn(
                  "w-12 h-12 border flex flex-col items-center justify-center transition-all duration-200 text-xl",
                  mood === val ? "bg-accent text-brand-50 border-accent" : "bg-transparent text-brand-400 border-brand-200 hover:border-accent hover:text-accent"
                )}
              >
                <span>{moodEmojis[val-1]}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-4 px-4 text-[9px] uppercase tracking-widest text-brand-400 font-bold">
            <span>Low</span>
            <span>Neutral</span>
            <span>High</span>
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] mb-8 text-center text-brand-400">Urge Intensity</h3>
          <div className="space-y-6">
            <input 
              type="range" 
              min="1" 
              max="5" 
              value={urge} 
              onChange={(e) => setUrge(parseInt(e.target.value))}
              className="w-full h-1 bg-brand-100 appearance-none cursor-pointer accent-brand-900"
            />
            <div className="flex justify-between text-[9px] font-bold text-brand-400 uppercase tracking-widest">
              <span>None</span>
              <span>Mild</span>
              <span>Moderate</span>
              <span>Strong</span>
              <span>Critical</span>
            </div>
          </div>
        </section>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-4 bg-accent text-white font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50"
        >
          {submitting ? "Processing..." : "Submit Data"}
        </button>
      </div>
    </div>
  );
};

const Journal = ({ onComplete, token }: { onComplete: () => void, token: string | null }) => {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || !token) return;
    setSubmitting(true);
    await fetch("/api/journal", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ content })
    });
    setSubmitting(false);
    setContent("");
    onComplete();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <header className="border-b border-brand-900 pb-6">
        <h2 className="text-3xl font-bold uppercase tracking-tighter text-brand-900">Journal</h2>
        <p className="text-brand-500 text-sm mt-1 uppercase tracking-widest font-mono">Session ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
      </header>

      <div className="bg-brand-50 border border-brand-200 p-8 card-shadow">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Begin transcription of internal state..."
          className="w-full h-80 bg-brand-100/30 border-none p-8 focus:ring-0 resize-none font-serif text-lg leading-relaxed placeholder:text-brand-300 text-brand-900"
        />
        <div className="mt-8 flex justify-between items-center">
          <p className="text-[10px] text-brand-400 uppercase tracking-widest font-bold">Confidentiality: High</p>
          <button
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            className="px-10 py-3 bg-accent text-white font-bold uppercase tracking-widest text-xs hover:opacity-90 transition-all disabled:opacity-50"
          >
            {submitting ? "Uploading..." : "Commit Entry"}
          </button>
        </div>
      </div>
    </div>
  );
};

const Resources = () => {
  const resources = [
    { title: "Trigger Identification", category: "Education", time: "5 min", icon: Zap },
    { title: "Neuroplasticity & Habit", category: "Science", time: "8 min", icon: BookOpen },
    { title: "Somatic Grounding", category: "Practice", time: "10 min", icon: Heart },
    { title: "Structural Support", category: "Social", time: "6 min", icon: ShieldAlert },
  ];

  return (
    <div className="space-y-10">
      <header className="border-b border-brand-900 pb-6">
        <h2 className="text-3xl font-bold uppercase tracking-tighter">Resources</h2>
        <p className="text-brand-500 text-sm mt-1 uppercase tracking-widest font-mono">Knowledge Base / v1.0.4</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {resources.map((r, i) => (
          <motion.div
            key={i}
            whileHover={{ x: 5 }}
            className="bg-brand-50 p-8 border border-brand-200 card-shadow flex items-center gap-8 cursor-pointer group"
          >
            <div className="w-14 h-14 border border-accent flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all duration-300">
              <r.icon size={24} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[9px] uppercase tracking-widest font-bold text-brand-400">{r.category}</span>
                <span className="text-[9px] text-brand-400 font-mono">{r.time}</span>
              </div>
              <h4 className="text-lg font-bold uppercase tracking-tight text-brand-900">{r.title}</h4>
            </div>
            <ChevronRight className="text-brand-200 group-hover:text-brand-900 transition-colors" size={20} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const Emergency = () => {
  const [showPanic, setShowPanic] = useState(false);

  const copingSteps = [
    "Cease all current activity. Inhale for 4 seconds, hold for 4, exhale for 4.",
    "Introduce a physical shock: Cold water on face or hands.",
    "Identify 5 objects in your immediate proximity.",
    "Initiate contact with your designated support anchor.",
    "Acknowledge the urge as a physiological event. It will reach peak intensity and then decline."
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      {!showPanic ? (
        <div className="text-center space-y-10">
          <div className="w-20 h-20 border-2 border-accent flex items-center justify-center mx-auto">
            <AlertCircle className="text-accent" size={40} />
          </div>
          <header className="border-b border-brand-200 pb-8">
            <h2 className="text-4xl font-bold uppercase tracking-tighter">Emergency Protocol</h2>
            <p className="text-brand-500 text-sm mt-2 uppercase tracking-widest">Immediate intervention required</p>
          </header>
          
          <button
            onClick={() => setShowPanic(true)}
            className="w-full py-10 bg-accent text-white font-bold text-2xl hover:opacity-90 transition-all shadow-2xl uppercase tracking-[0.2em]"
          >
            Activate Support
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-8 bg-brand-50 border border-brand-200 card-shadow">
              <p className="text-[10px] font-bold text-brand-400 uppercase mb-3 tracking-widest">Crisis Text Line</p>
              <p className="text-xl font-bold font-mono text-brand-900">741741</p>
            </div>
            <div className="p-8 bg-brand-50 border border-brand-200 card-shadow">
              <p className="text-[10px] font-bold text-brand-400 uppercase mb-3 tracking-widest">National Helpline</p>
              <p className="text-xl font-bold font-mono text-brand-900">1-800-662-4357</p>
            </div>
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-brand-50 border-4 border-accent p-12 card-shadow"
        >
          <div className="flex justify-between items-center mb-10 border-b border-brand-200 pb-6">
            <h2 className="text-2xl font-bold uppercase tracking-tighter text-accent">Active Intervention</h2>
            <button onClick={() => setShowPanic(false)} className="text-brand-400 hover:text-accent">
              <X size={24} />
            </button>
          </div>
          
          <div className="space-y-8">
            {copingSteps.map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-6 items-start"
              >
                <div className="w-8 h-8 border border-accent flex items-center justify-center shrink-0 text-xs font-bold text-accent">
                  {i + 1}
                </div>
                <p className="text-lg text-brand-900 pt-0.5 leading-relaxed">{step}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 pt-10 border-t border-brand-200">
            <p className="text-center text-brand-400 text-xs uppercase tracking-widest mb-8">"This state is temporary. Your commitment is absolute."</p>
            <button 
              onClick={() => setShowPanic(false)}
              className="w-full py-4 bg-accent text-white font-bold uppercase tracking-widest text-sm hover:opacity-90 transition-all"
            >
              Stabilization Confirmed
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

const AdminLogin = ({ onLogin, token }: { onLogin: (user: UserData) => void, token: string | null }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const res = await fetch("/api/admin/promote", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data.user);
      } else {
        setError(true);
        setTimeout(() => setError(false), 2000);
      }
    } catch (err) {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-10 bg-brand-50 border border-brand-200 rounded-sm card-shadow">
      <div className="text-center mb-8">
        <ShieldAlert className="mx-auto mb-4 text-brand-900" size={48} />
        <h2 className="text-2xl font-bold uppercase tracking-tight text-brand-900">Restricted Access</h2>
        <p className="text-brand-500 text-sm mt-2">Please enter the administrator password</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className={cn(
              "w-full px-4 py-3 border rounded-sm focus:outline-none focus:ring-1 focus:ring-brand-900 transition-all bg-brand-100 text-brand-900",
              error ? "border-red-500" : "border-brand-200"
            )}
          />
        </div>
        <button type="submit" className="w-full btn-primary">
          Authenticate
        </button>
      </form>
    </div>
  );
};

const AdminPanel = ({ token }: { token: string | null }) => {
  const [users, setUsers] = useState<UserData[]>([]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/users", {
      headers: { "Authorization": `Bearer ${token}` }
    }).then(res => res.json()).then(setUsers);
  }, [token]);

  return (
    <div className="space-y-10">
      <header className="border-b border-brand-900 pb-6">
        <h2 className="text-3xl font-bold uppercase tracking-tighter text-brand-900">System Administration</h2>
        <p className="text-brand-500 text-sm mt-1">Operational overview and user management</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Total Users", value: users.length, icon: User },
          { label: "Active Sessions", value: "12", icon: Zap },
          { label: "System Health", value: "99%", icon: CheckCircle2 },
          { label: "Alerts", value: "0", icon: AlertCircle },
        ].map((stat, i) => (
          <div key={i} className="p-6 bg-accent text-white rounded-sm">
            <stat.icon size={20} className="mb-4 opacity-50 text-white" />
            {/* FIX FOR ADMIN PANEL TEXT: */}
            <p className="text-white text-xs uppercase tracking-widest opacity-70">{stat.label}</p>
            <p className="text-white text-2xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-brand-50 border border-brand-200 rounded-sm overflow-hidden">
        <div className="px-6 py-4 bg-brand-100 border-b border-brand-200">
          <h3 className="text-sm font-bold uppercase tracking-wider text-brand-900">User Directory</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-brand-100">
              <th className="px-6 py-4 font-bold uppercase tracking-widest text-brand-400 text-[10px]">Identity</th>
              <th className="px-6 py-4 font-bold uppercase tracking-widest text-brand-400 text-[10px]">Contact</th>
              <th className="px-6 py-4 font-bold uppercase tracking-widest text-brand-400 text-[10px]">Privileges</th>
              <th className="px-6 py-4 font-bold uppercase tracking-widest text-brand-400 text-[10px]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-brand-100 transition-colors">
                <td className="px-6 py-4 font-medium text-brand-900">{u.name}</td>
                <td className="px-6 py-4 text-brand-500 font-mono">{u.email}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-0.5 border text-[9px] font-bold uppercase tracking-tighter",
                    u.role === "admin" ? "border-accent bg-accent text-white" : "border-brand-300 text-brand-600"
                  )}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full" />
                    <span className="text-brand-400">Online</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LandingPage = ({ onGetStarted }: { onGetStarted: () => void }) => {
  return (
    <div className="min-h-screen bg-brand-50 text-brand-900 transition-colors duration-300">
      <nav className="p-8 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-900 rounded-full flex items-center justify-center">
            <Heart className="text-brand-50" size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight uppercase">Serenity</h1>
        </div>
        <button onClick={onGetStarted} className="btn-primary">Get Started</button>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-24 grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
        <div className="space-y-10">
          <div className="space-y-4">
            <h2 className="text-7xl font-bold tracking-tighter uppercase leading-[0.9]">
              Your Path to <br />
              <span className="text-accent">Resilience</span>
            </h2>
            <p className="text-xl text-brand-500 max-w-lg leading-relaxed">
              An AI-powered sanctuary designed to support your journey through recovery with data-driven insights and compassionate guidance.
            </p>
          </div>
          <div className="flex gap-6">
            <button onClick={onGetStarted} className="btn-primary px-10 py-4 text-lg">Start Your Journey</button>
            <button className="btn-secondary px-10 py-4 text-lg">Learn More</button>
          </div>
          <div className="grid grid-cols-3 gap-8 pt-12 border-t border-brand-200">
            <div>
              <p className="text-3xl font-bold">24/7</p>
              <p className="text-xs uppercase tracking-widest text-brand-400 font-bold mt-1">AI Support</p>
            </div>
            <div>
              <p className="text-3xl font-bold">100%</p>
              <p className="text-xs uppercase tracking-widest text-brand-400 font-bold mt-1">Confidential</p>
            </div>
            <div>
              <p className="text-3xl font-bold">0.0</p>
              <p className="text-xs uppercase tracking-widest text-brand-400 font-bold mt-1">Judgment</p>
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="aspect-square bg-brand-100 border border-brand-200 p-12 flex flex-col justify-center gap-8 card-shadow">
            <div className="space-y-2">
              <div className="w-12 h-1 bg-accent" />
              <h3 className="text-2xl font-bold uppercase tracking-tight">Real-time Analysis</h3>
              <p className="text-brand-500 text-sm">Our neural networks analyze your behavioral patterns to predict and prevent relapse before it occurs.</p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-1 bg-brand-900" />
              <h3 className="text-2xl font-bold uppercase tracking-tight">Cognitive Journaling</h3>
              <p className="text-brand-500 text-sm">Transcribe your internal state. Our AI identifies sentiment trends and cognitive distortions.</p>
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-accent/10 -z-10 blur-3xl" />
        </div>
      </main>
    </div>
  );
};

const Auth = ({ onAuthSuccess }: { onAuthSuccess: (token: string, user: UserData) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";
    const body = isLogin ? { email, password } : { email, password, name };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        onAuthSuccess(data.token, data.user);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Connection error");
    }
  };

  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center p-8 transition-colors duration-300">
      <div className="w-full max-w-md space-y-12">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-brand-900 rounded-full flex items-center justify-center mx-auto">
            <Heart className="text-brand-50" size={32} />
          </div>
          <h2 className="text-4xl font-bold tracking-tighter uppercase">{isLogin ? "Welcome Back" : "Join Serenity"}</h2>
          <p className="text-brand-500 uppercase tracking-widest text-xs font-bold">Sign In</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-brand-400">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-brand-100 border border-brand-200 px-6 py-4 focus:outline-none focus:border-brand-900 transition-all text-brand-900"
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-brand-400">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-brand-100 border border-brand-200 px-6 py-4 focus:outline-none focus:border-brand-900 transition-all text-brand-900"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-brand-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-brand-100 border border-brand-200 px-6 py-4 focus:outline-none focus:border-brand-900 transition-all text-brand-900"
              required
            />
          </div>

          {error && <p className="text-black text-xs font-bold uppercase tracking-widest text-center">{error}</p>}

          <button type="submit" className="w-full py-5 bg-brand-900 text-brand-50 font-bold uppercase tracking-widest hover:bg-brand-800 transition-all">
            {isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[10px] font-bold uppercase tracking-widest text-brand-400 hover:text-brand-900 transition-colors"
          >
            {isLogin ? "Need an account? Sign up" : "Already registered? Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState<View>("landing");
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [risk, setRisk] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("serenity_token"));

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const fetchData = async () => {
    if (!token) {
      setLoading(false);
      setView("landing");
      return;
    }

    try {
      const [statsRes, userRes] = await Promise.all([
        fetch("/api/stats", { headers: { "Authorization": `Bearer ${token}` } }),
        fetch("/api/user", { headers: { "Authorization": `Bearer ${token}` } })
      ]);
      
      if (statsRes.status === 401 || userRes.status === 401) {
        handleLogout();
        return;
      }

      const data = await statsRes.json();
      const userData = await userRes.json();
      
      setMoods(data.moods);
      setJournals(data.journals);
      setUser(userData);
      setIsAdmin(userData.role === 'admin');
      setView("dashboard");
      
      // Show motivational notification
      const quotes = [
        "You are stronger than your strongest urge.",
        "Recovery is not a race. It's a journey.",
        "Every day is a new beginning.",
        "You've survived 100% of your bad days so far.",
        "Progress, not perfection."
      ];
      setNotification(quotes[Math.floor(Math.random() * quotes.length)]);
      setTimeout(() => setNotification(null), 5000);

      if (data.moods.length > 0) {
        const riskData = await predictRelapseRisk(data.moods, data.journals, token);
        setRisk(riskData);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleAuthSuccess = (newToken: string, newUser: UserData) => {
    localStorage.setItem("serenity_token", newToken);
    setToken(newToken);
    setUser(newUser);
    setIsAdmin(newUser.role === 'admin');
    setView("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("serenity_token");
    setToken(null);
    setUser(null);
    setIsAdmin(false);
    setView("landing");
  };

  const handleActionComplete = () => {
    fetchData();
    setView("dashboard");
  };

  if (loading) {
    return (
      <div className={cn("h-screen flex items-center justify-center bg-brand-50", darkMode && "dark")}>
        <div className="text-center space-y-4">
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-16 h-16 bg-brand-900 rounded-full flex items-center justify-center mx-auto"
          >
            <Heart className="text-brand-50 fill-brand-50" size={32} />
          </motion.div>
          <p className="font-serif italic text-brand-500">Preparing your sanctuary...</p>
        </div>
      </div>
    );
  }

  if (view === "landing") {
    return <LandingPage onGetStarted={() => setView("auth")} />;
  }

  if (view === "auth") {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className={cn("min-h-screen bg-brand-50 flex", darkMode && "dark")}>
      <Sidebar 
        activeView={view} 
        setView={setView} 
        isAdmin={isAdmin} 
        darkMode={darkMode} 
        toggleDarkMode={() => setDarkMode(!darkMode)} 
        onLogout={handleLogout}
      />
      
      <main className="flex-1 ml-64 p-12 max-w-5xl mx-auto transition-colors duration-300">
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-10 right-10 z-[100] bg-brand-900 text-brand-50 px-6 py-4 rounded-sm shadow-2xl flex items-center gap-3"
            >
              <CheckCircle2 size={18} className="text-brand-50" />
              {/* FIX FOR NOTIFICATION POPUP TEXT: */}
              <p className="text-brand-50 text-sm font-medium uppercase tracking-tight">{notification}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            {view === "dashboard" && <Dashboard moods={moods} journals={journals} risk={risk} user={user} />}
            {view === "chat" && <AIChat token={token} />}
            {view === "checkin" && <CheckIn onComplete={handleActionComplete} token={token} />}
            {view === "journal" && <Journal onComplete={handleActionComplete} token={token} />}
            {view === "resources" && <Resources />}
            {view === "emergency" && <Emergency />}
            {view === "admin-login" && <AdminLogin onLogin={(newUser) => { setUser(newUser); setIsAdmin(true); setView("admin"); }} token={token} />}
            {view === "admin" && isAdmin && <AdminPanel token={token} />}
            {view === "admin" && !isAdmin && <AdminLogin onLogin={(newUser) => { setUser(newUser); setIsAdmin(true); setView("admin"); }} token={token} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}