import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, X, Loader2, Volume2, MicOff } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { usePersonalization } from "@/hooks/usePersonalization";

const VOICE_BOT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-bot`;

type Msg = { role: "user" | "assistant"; text: string };

export default function VoiceBubble() {
  const { i18n } = useTranslation();
  const { active } = useActiveProfile();
  const { ctx } = usePersonalization();
  const [open, setOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [history, setHistory] = useState<Msg[]>([]);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      mediaRecorder.current?.stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorder.current = mr;
      chunks.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      mr.onstop = () => handleStop();
      mr.start();
      setRecording(true);
    } catch (e: any) {
      toast.error("Microphone access denied. Enable it in browser settings.");
    }
  };

  const stopRec = () => {
    mediaRecorder.current?.stop();
    mediaRecorder.current?.stream?.getTracks().forEach((t) => t.stop());
    setRecording(false);
  };

  const handleStop = async () => {
    setProcessing(true);
    try {
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      // Convert to base64
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);

      const resp = await fetch(VOICE_BOT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          audio: b64,
          mime: "audio/webm",
          language: i18n.language,
          profile: active,
          context: ctx,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Voice bot failed (${resp.status})`);
      }

      const data = await resp.json();
      const userText: string = data.transcript || "(unrecognized)";
      const reply: string = data.reply || "Sorry, I couldn't understand.";

      setHistory((h) => [...h, { role: "user", text: userText }, { role: "assistant", text: reply }]);

      // Browser TTS for voice playback
      if ("speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(reply);
        u.lang = i18n.language === "hi" ? "hi-IN" : i18n.language === "bn" ? "bn-IN" : i18n.language === "ta" ? "ta-IN" : i18n.language === "te" ? "te-IN" : "en-IN";
        u.rate = 1.0;
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
      }
    } catch (e: any) {
      toast.error(e.message || "Voice processing failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      {/* Floating bubble */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 200 }}
        onClick={() => setOpen(!open)}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full gradient-primary text-primary-foreground shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
        aria-label="Voice assistant"
        title="Krishi Voice — speak in any language"
      >
        <Mic className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-krishi-gold animate-pulse" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-44 right-6 z-40 w-[340px] max-w-[90vw] glass-card p-4 shadow-2xl border-2 border-primary/20"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                  <Volume2 className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <div className="font-display font-semibold text-foreground text-sm">Krishi Voice</div>
                  <div className="text-[10px] text-muted-foreground">Speak in {i18n.language.toUpperCase()}</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 mb-3 text-xs">
              {history.length === 0 && (
                <p className="text-muted-foreground italic text-center py-3">
                  🎙️ Tap the mic and ask anything about your farm — in any language
                </p>
              )}
              {history.slice(-6).map((m, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-lg ${
                    m.role === "user" ? "bg-primary/10 text-foreground" : "bg-muted/50 text-foreground"
                  }`}
                >
                  <span className="font-semibold mr-1">{m.role === "user" ? "You:" : "🌾"}</span>
                  {m.text}
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-2">
              {processing ? (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" /> Processing…
                </div>
              ) : recording ? (
                <button
                  onClick={stopRec}
                  className="w-16 h-16 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg animate-pulse"
                  aria-label="Stop"
                >
                  <MicOff className="h-7 w-7" />
                </button>
              ) : (
                <button
                  onClick={startRec}
                  className="w-16 h-16 rounded-full gradient-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition"
                  aria-label="Record"
                >
                  <Mic className="h-7 w-7" />
                </button>
              )}
              <p className="text-[10px] text-muted-foreground">
                {recording ? "Listening… tap to stop" : processing ? "Wait a moment" : "Tap mic and speak"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <audio ref={audioRef} hidden />
    </>
  );
}
