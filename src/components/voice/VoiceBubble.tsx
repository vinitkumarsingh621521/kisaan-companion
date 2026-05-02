import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, X, Loader2, Volume2, MicOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; text: string };

// Map app language codes → BCP-47 for SpeechSynthesis / SpeechRecognition
const LANG_BCP: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  bn: "bn-IN",
  ta: "ta-IN",
  te: "te-IN",
  kn: "kn-IN",
  mr: "mr-IN",
  gu: "gu-IN",
  pa: "pa-IN",
  ml: "ml-IN",
  or: "or-IN",
  as: "as-IN",
  ur: "ur-IN",
};

function getBrowserSTT(): any {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

function pickMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  if (typeof MediaRecorder === "undefined") return "";
  for (const c of candidates) {
    try {
      if ((MediaRecorder as any).isTypeSupported?.(c)) return c;
    } catch {}
  }
  return "";
}

export default function VoiceBubble() {
  const { i18n } = useTranslation();
  const { active } = useActiveProfile();
  const [open, setOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [history, setHistory] = useState<Msg[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorder.current = null;
  }, []);

  useEffect(() => () => cleanupStream(), [cleanupStream]);

  const pickVoice = (lang: string): SpeechSynthesisVoice | null => {
    if (!("speechSynthesis" in window)) return null;
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return null;
    const exact = voices.find((v) => v.lang === lang);
    if (exact) return exact;
    const root = lang.split("-")[0];
    // Prefer Google / natural voices for that root language
    const natural = voices.find((v) => v.lang.startsWith(root) && /google|natural|neural|premium/i.test(v.name));
    if (natural) return natural;
    const any = voices.find((v) => v.lang.startsWith(root));
    return any || null;
  };

  const speakBrowser = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      const lang = LANG_BCP[i18n.language] || "en-IN";
      u.lang = lang;
      const v = pickVoice(lang);
      if (v) u.voice = v;
      u.rate = 0.95;
      u.pitch = 1.0;
      u.volume = 1.0;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch (e) {
      console.warn("TTS failed", e);
    }
  };

  const playServerAudio = async (b64: string, mime: string) => {
    try {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);
      const audio = audioRef.current || new Audio();
      audioRef.current = audio;
      audio.src = url;
      await audio.play();
      audio.onended = () => URL.revokeObjectURL(url);
    } catch (e) {
      console.warn("Server audio playback failed, falling back", e);
      throw e;
    }
  };

  const speak = async (text: string, serverAudio?: { audio?: string; mime?: string }) => {
    if (serverAudio?.audio && serverAudio?.mime) {
      try {
        await playServerAudio(serverAudio.audio, serverAudio.mime);
        return;
      } catch {}
    }
    speakBrowser(text);
  };

  // Prime voices list (Chrome loads async)
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () => speechSynthesis.getVoices();
    load();
    speechSynthesis.onvoiceschanged = load;
  }, []);

  const sendToBot = async (payload: { audio?: string; mime?: string; text?: string }) => {
    const { data, error } = await supabase.functions.invoke("voice-bot", {
      body: {
        ...payload,
        language: i18n.language,
        profile: active,
      },
    });
    if (error) throw new Error(error.message || "Voice bot failed");
    if (!data) throw new Error("No response from voice bot");
    if ((data as any).error) throw new Error((data as any).error);
    return data as { transcript: string; reply: string; audio?: string; audioMime?: string };
  };

  // ───── Path A: Browser SpeechRecognition (Chrome/Edge desktop, Android) ─────
  const startBrowserSTT = () => {
    const SR = getBrowserSTT();
    if (!SR) return false;
    try {
      const rec = new SR();
      rec.lang = LANG_BCP[i18n.language] || "en-IN";
      rec.interimResults = false;
      rec.continuous = false;
      rec.maxAlternatives = 1;

      let finalText = "";
      rec.onresult = (ev: any) => {
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          if (ev.results[i].isFinal) finalText += ev.results[i][0].transcript;
        }
      };
      rec.onerror = (ev: any) => {
        setRecording(false);
        recognitionRef.current = null;
        if (ev.error === "not-allowed") {
          setError("Microphone permission denied — enable it in browser settings.");
          toast.error("Microphone permission denied");
        } else if (ev.error === "no-speech") {
          toast.message("Didn't hear anything — try again");
        } else {
          toast.error(`Voice error: ${ev.error}`);
        }
      };
      rec.onend = async () => {
        setRecording(false);
        recognitionRef.current = null;
        if (!finalText.trim()) return;
        setProcessing(true);
        try {
          const r = await sendToBot({ text: finalText });
          setHistory((h) => [...h, { role: "user", text: r.transcript }, { role: "assistant", text: r.reply }]);
          speak(r.reply, { audio: r.audio, mime: r.audioMime });
        } catch (e: any) {
          toast.error(e?.message || "Could not get reply");
        } finally {
          setProcessing(false);
        }
      };
      // start() must be called synchronously inside the user click handler
      rec.start();
      recognitionRef.current = rec;
      setRecording(true);
      setError(null);
      return true;
    } catch (e: any) {
      console.warn("Browser STT failed to start, falling back to MediaRecorder", e);
      return false;
    }
  };

  // ───── Path B: MediaRecorder → Whisper (Safari, Firefox, others) ─────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorder.current = mr;
      chunks.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      mr.onstop = () => handleStop();
      mr.start();
      setRecording(true);
      setError(null);
    } catch (e: any) {
      const name = e?.name || "";
      if (name === "NotAllowedError") {
        setError("Microphone blocked. Allow it in your browser address bar then retry.");
        toast.error("Microphone blocked");
      } else if (name === "NotFoundError") {
        setError("No microphone found on this device.");
        toast.error("No microphone found");
      } else if (name === "NotSupportedError") {
        setError("Audio recording not supported. Try Chrome on desktop or Android.");
        toast.error("Recording not supported");
      } else {
        setError(e?.message || "Could not access microphone");
        toast.error("Microphone error");
      }
    }
  };

  const handleStart = () => {
    setError(null);
    // Try the gesture-friendly browser STT first
    if (!startBrowserSTT()) {
      void startRecording();
    }
  };

  const handleStop = async () => {
    cleanupStream();
    setRecording(false);
    if (chunks.current.length === 0) return;
    setProcessing(true);
    try {
      const mr = mediaRecorder.current;
      const mime = mr?.mimeType || "audio/webm";
      const blob = new Blob(chunks.current, { type: mime });
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      // Chunked btoa to avoid stack overflow on large blobs
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
      }
      const b64 = btoa(binary);

      const r = await sendToBot({ audio: b64, mime });
      setHistory((h) => [...h, { role: "user", text: r.transcript }, { role: "assistant", text: r.reply }]);
      speak(r.reply, { audio: r.audio, mime: r.audioMime });
    } catch (e: any) {
      toast.error(e?.message || "Voice processing failed");
    } finally {
      setProcessing(false);
    }
  };

  const stopAll = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
      setRecording(false);
      return;
    }
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.stop();
    } else {
      cleanupStream();
      setRecording(false);
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
                  <div className="text-[10px] text-muted-foreground">Speak in {(LANG_BCP[i18n.language] || "en-IN").toUpperCase()}</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-[11px] mb-2">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="max-h-48 overflow-y-auto space-y-2 mb-3 text-xs">
              {history.length === 0 && (
                <p className="text-muted-foreground italic text-center py-3">
                  🎙️ Tap the mic and ask anything — I speak 13 Indian languages
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
                  <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
                </div>
              ) : recording ? (
                <button
                  onClick={stopAll}
                  className="w-16 h-16 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg animate-pulse"
                  aria-label="Stop"
                >
                  <MicOff className="h-7 w-7" />
                </button>
              ) : (
                <button
                  onClick={handleStart}
                  className="w-16 h-16 rounded-full gradient-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition"
                  aria-label="Record"
                >
                  <Mic className="h-7 w-7" />
                </button>
              )}
              <p className="text-[10px] text-muted-foreground text-center">
                {recording ? "Listening… tap to stop" : processing ? "One moment…" : "Tap mic and speak"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <audio ref={audioRef} hidden />
    </>
  );
}
