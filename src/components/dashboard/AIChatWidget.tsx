import { useState, useRef, useEffect } from "react";
import { Bot, Send, Mic, MicOff, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";
import { supabase } from "@/integrations/supabase/client";

type Message = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/krishi-ai`;

const quickPrompts = [
  "🌾 Best crops for Kharif season?",
  "🐛 How to control stem borer in rice?",
  "💧 Drip irrigation setup cost?",
  "📋 PM-KISAN eligibility?",
  "🌱 Organic farming tips",
  "🌡️ Soil pH correction methods",
];

export default function AIChatWidget() {
  const { active } = useActiveProfile();
  const { ctx } = usePersonalization();
  const greeting = active?.full_name
    ? `🙏 Namaste **${active.full_name}**! I'm **KrishiMitra AI** — I can see your farm details, so my advice is tuned just for you.\n\nAsk me anything about your crops, diseases, schemes — in any language!`
    : "🙏 Namaste! I'm **KrishiMitra AI** — your intelligent farming advisor.\n\nAsk me anything about crops, diseases, government schemes, or farming practices. I speak Hindi too! मैं हिंदी में भी बात कर सकता हूँ।";
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: greeting },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Listen for cross-component prefill events (e.g. from disease scanner quick-action buttons)
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<{ text: string }>).detail?.text;
      if (!text) return;
      sendMessage(text);
    };
    window.addEventListener("krishi-prefill", handler as EventListener);
    return () => window.removeEventListener("krishi-prefill", handler as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, active, messages, isLoading]);

  const streamChat = async (allMessages: Message[]) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ action: "chat", messages: allMessages, profileContext: ctx, profile: active }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || "Failed to get AI response");
    }

    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantSoFar = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            assistantSoFar += content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && prev.length > 1) {
                return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
              }
              return [...prev, { role: "assistant", content: assistantSoFar }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
  };

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;

    const userMsg: Message = { role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      await streamChat(newMessages);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        toast.error(e.message || "AI is temporarily unavailable");
        setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Sorry, I couldn't process that. Please try again." }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const stopRecorder = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    else setIsListening(false);
  };

  const blobToBase64 = async (blob: Blob) => {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
    }
    return btoa(binary);
  };

  const startRecorderFallback = async () => {
    try {
      if (typeof MediaRecorder === "undefined") {
        toast.error("Voice recording is not supported in this browser");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setIsListening(false);
        if (!chunksRef.current.length) return;
        try {
          toast.info("Understanding your voice…");
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          const audio = await blobToBase64(blob);
          const { data, error } = await supabase.functions.invoke("voice-bot", {
            body: { audio, mime: blob.type, language: (navigator.language || "en-IN").split("-")[0], profile: active, transcribeOnly: true },
          });
          if (error) throw error;
          const transcript = (data as any)?.transcript?.trim();
          if (!transcript) throw new Error("No speech recognized");
          await sendMessage(transcript);
        } catch (e: any) {
          toast.error(e?.message || "Could not recognize speech");
        }
      };
      recorder.start();
      setIsListening(true);
      toast.info("🎤 Recording… tap the mic again to send");
    } catch (e: any) {
      setIsListening(false);
      toast.error(e?.name === "NotAllowedError" ? "Microphone blocked" : "Could not access microphone");
    }
  };

  const handleVoice = async () => {
    if (isListening) {
      try { recognitionRef.current?.stop?.(); } catch {}
      stopRecorder();
      return;
    }
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      await startRecorderFallback();
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = navigator.language || "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    let startedFallback = false;

    recognition.onstart = () => { setIsListening(true); toast.info("🎤 Listening... Speak now!"); };
    recognition.onresult = (e: any) => {
      const transcript = e.results?.[0]?.[0]?.transcript?.trim();
      setIsListening(false);
      if (transcript) void sendMessage(transcript);
      else void startRecorderFallback();
    };
    recognition.onerror = (e: any) => {
      setIsListening(false);
      if (["no-speech", "network", "audio-capture", "service-not-allowed"].includes(e?.error)) {
        startedFallback = true;
        toast.info("Browser speech failed — trying Krishi recorder");
        void startRecorderFallback();
      } else if (e?.error === "not-allowed") {
        toast.error("Microphone permission denied");
      } else {
        toast.error("Could not recognize speech");
      }
    };
    recognition.onend = () => { recognitionRef.current = null; if (!startedFallback) setIsListening(false); };
    try { recognition.start(); } catch { await startRecorderFallback(); }
  };

  const clearChat = () => {
    setMessages([messages[0]]);
    toast.success("Chat cleared");
  };

  return (
    <div className="glass-card p-5 flex flex-col" style={{ height: "520px" }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
          AI Krishi Advisor
        </h3>
        <div className="flex items-center gap-1">
          <span className="krishi-badge bg-primary/10 text-primary text-[10px]">
            <Sparkles className="h-3 w-3" /> Powered by AI
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearChat}>
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {quickPrompts.map((p) => (
            <button
              key={p}
              onClick={() => sendMessage(p)}
              className="text-xs px-2.5 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  m.role === "user"
                    ? "gradient-primary text-primary-foreground rounded-br-md"
                    : "bg-muted/50 text-foreground rounded-bl-md"
                }`}
              >
                {m.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1.5 [&>ul]:mb-1.5 [&>ol]:mb-1.5 [&>p:last-child]:mb-0">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  m.content
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="bg-muted/50 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Ask about crops, diseases, schemes..."
            className="w-full h-10 pl-3 pr-10 rounded-xl bg-muted/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            disabled={isLoading}
          />
          <button
            onClick={handleVoice}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
              isListening ? "bg-destructive/10 text-destructive" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        </div>
        <Button
          size="icon"
          className="h-10 w-10 gradient-primary border-0 text-primary-foreground rounded-xl"
          onClick={() => sendMessage()}
          disabled={!input.trim() || isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
