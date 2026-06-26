const name = errName(e);import { useState, useRef, useEffect, useCallback } from "react";
const name = errName(e);import { motion, AnimatePresence } from "framer-motion";
const name = errName(e);import { Mic, X, Loader2, Volume2, MicOff, AlertCircle, Settings2, Activity, Pause, Play, Square, Sparkles } from "lucide-react";
const name = errName(e);
const name = errName(e);const WAVE_BARS = [1, 2, 3, 4, 5, 6, 7];
const name = errName(e);
const name = errName(e);import { toast } from "sonner";
const name = errName(e);import { useTranslation } from "react-i18next";
const name = errName(e);import { useActiveProfile } from "@/hooks/useActiveProfile";
const name = errName(e);import { supabase } from "@/integrations/supabase/client";
const name = errName(e);import { errMsg, errName } from "@/lib/errors";
const name = errName(e);
const name = errName(e);type Msg = { role: "user" | "assistant"; text: string };
const name = errName(e);
const name = errName(e);// Map app language codes → BCP-47 for SpeechSynthesis / SpeechRecognition
const name = errName(e);const LANG_BCP: Record<string, string> = {
const name = errName(e);  en: "en-IN",
const name = errName(e);  hi: "hi-IN",
const name = errName(e);  bn: "bn-IN",
const name = errName(e);  ta: "ta-IN",
const name = errName(e);  te: "te-IN",
const name = errName(e);  kn: "kn-IN",
const name = errName(e);  mr: "mr-IN",
const name = errName(e);  gu: "gu-IN",
const name = errName(e);  pa: "pa-IN",
const name = errName(e);  ml: "ml-IN",
const name = errName(e);  or: "or-IN",
const name = errName(e);  as: "as-IN",
const name = errName(e);  ur: "ur-IN",
const name = errName(e);};
const name = errName(e);
const name = errName(e);function getBrowserSTT(): any {
const name = errName(e);  if (typeof window === "undefined") return null;
const name = errName(e);  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
const name = errName(e);}
const name = errName(e);
const name = errName(e);function pickMimeType(): string {
const name = errName(e);  const candidates = [
const name = errName(e);    "audio/webm;codecs=opus",
const name = errName(e);    "audio/webm",
const name = errName(e);    "audio/mp4",
const name = errName(e);    "audio/ogg;codecs=opus",
const name = errName(e);  ];
const name = errName(e);  if (typeof MediaRecorder === "undefined") return "";
const name = errName(e);  for (const c of candidates) {
const name = errName(e);    try {
const name = errName(e);      if ((MediaRecorder as any).isTypeSupported?.(c)) return c;
const name = errName(e);    } catch {}
const name = errName(e);  }
const name = errName(e);  return "";
const name = errName(e);}
const name = errName(e);
const name = errName(e);export default function VoiceBubble() {
const name = errName(e);  const { i18n } = useTranslation();
const name = errName(e);  const { active } = useActiveProfile();
const name = errName(e);  const [open, setOpen] = useState(false);
const name = errName(e);  const [recording, setRecording] = useState(false);
const name = errName(e);  const [processing, setProcessing] = useState(false);
const name = errName(e);  const [history, setHistory] = useState<Msg[]>([]);
const name = errName(e);  const [error, setError] = useState<string | null>(null);
const name = errName(e);  const [voiceLang, setVoiceLang] = useState<string>(i18n.language || "en");
const name = errName(e);  const [showDiag, setShowDiag] = useState(false);
const name = errName(e);  const [diag, setDiag] = useState<{ micPermission?: string; sttProvider?: string; chatProvider?: string; audioMime?: string; sttError?: string; lastStatus?: string; sttConfidence?: number | null }>({});
const name = errName(e);  const [playState, setPlayState] = useState<"idle" | "playing" | "paused">("idle");
const name = errName(e);  const ttsModeRef = useRef<"audio" | "browser" | null>(null);
const name = errName(e);
const name = errName(e);  // mic permission probe
const name = errName(e);  useEffect(() => {
const name = errName(e);    if (typeof navigator === "undefined" || !(navigator as any).permissions) return;
const name = errName(e);    (navigator as any).permissions.query({ name: "microphone" as PermissionName }).then((p: any) => {
const name = errName(e);      setDiag((d) => ({ ...d, micPermission: p.state }));
const name = errName(e);      p.onchange = () => setDiag((d) => ({ ...d, micPermission: p.state }));
const name = errName(e);    }).catch(() => setDiag((d) => ({ ...d, micPermission: "unknown" })));
const name = errName(e);  }, []);
const name = errName(e);
const name = errName(e);  const mediaRecorder = useRef<MediaRecorder | null>(null);
const name = errName(e);  const chunks = useRef<Blob[]>([]);
const name = errName(e);  const streamRef = useRef<MediaStream | null>(null);
const name = errName(e);  const recognitionRef = useRef<any>(null);
const name = errName(e);  const audioRef = useRef<HTMLAudioElement | null>(null);
const name = errName(e);
const name = errName(e);  const cleanupStream = useCallback(() => {
const name = errName(e);    streamRef.current?.getTracks().forEach((t) => t.stop());
const name = errName(e);    streamRef.current = null;
const name = errName(e);    mediaRecorder.current = null;
const name = errName(e);  }, []);
const name = errName(e);
const name = errName(e);  useEffect(() => () => cleanupStream(), [cleanupStream]);
const name = errName(e);
const name = errName(e);  const pickVoice = (lang: string): SpeechSynthesisVoice | null => {
const name = errName(e);    if (!("speechSynthesis" in window)) return null;
const name = errName(e);    const voices = speechSynthesis.getVoices();
const name = errName(e);    if (!voices.length) return null;
const name = errName(e);    const exact = voices.find((v) => v.lang === lang);
const name = errName(e);    if (exact) return exact;
const name = errName(e);    const root = lang.split("-")[0];
const name = errName(e);    // Prefer Google / natural voices for that root language
const name = errName(e);    const natural = voices.find((v) => v.lang.startsWith(root) && /google|natural|neural|premium/i.test(v.name));
const name = errName(e);    if (natural) return natural;
const name = errName(e);    const any = voices.find((v) => v.lang.startsWith(root));
const name = errName(e);    return any || null;
const name = errName(e);  };
const name = errName(e);
const name = errName(e);  const speakBrowser = (text: string) => {
const name = errName(e);    if (!("speechSynthesis" in window)) return;
const name = errName(e);    try {
const name = errName(e);      const u = new SpeechSynthesisUtterance(text);
const name = errName(e);      const lang = LANG_BCP[i18n.language] || "en-IN";
const name = errName(e);      u.lang = lang;
const name = errName(e);      const v = pickVoice(lang);
const name = errName(e);      if (v) u.voice = v;
const name = errName(e);      u.rate = lang.startsWith("en") ? 0.88 : 0.9;
const name = errName(e);      u.pitch = 1.06;
const name = errName(e);      u.volume = 1.0;
const name = errName(e);      u.onstart = () => { ttsModeRef.current = "browser"; setPlayState("playing"); };
const name = errName(e);      u.onend = () => { setPlayState("idle"); ttsModeRef.current = null; };
const name = errName(e);      u.onerror = () => { setPlayState("idle"); ttsModeRef.current = null; };
const name = errName(e);      speechSynthesis.cancel();
const name = errName(e);      speechSynthesis.speak(u);
const name = errName(e);    } catch (e) {
const name = errName(e);      console.warn("TTS failed", e);
const name = errName(e);    }
const name = errName(e);  };
const name = errName(e);
const name = errName(e);  const playServerAudio = async (b64: string, mime: string) => {
const name = errName(e);    const bin = atob(b64);
const name = errName(e);    const bytes = new Uint8Array(bin.length);
const name = errName(e);    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
const name = errName(e);    const blob = new Blob([bytes], { type: mime });
const name = errName(e);    const url = URL.createObjectURL(blob);
const name = errName(e);    const audio = audioRef.current || new Audio();
const name = errName(e);    audioRef.current = audio;
const name = errName(e);    audio.src = url;
const name = errName(e);    audio.onplay = () => { ttsModeRef.current = "audio"; setPlayState("playing"); };
const name = errName(e);    audio.onpause = () => { if (!audio.ended) setPlayState("paused"); };
const name = errName(e);    audio.onended = () => { setPlayState("idle"); ttsModeRef.current = null; URL.revokeObjectURL(url); };
const name = errName(e);    await audio.play();
const name = errName(e);  };
const name = errName(e);
const name = errName(e);  const speak = async (text: string, serverAudio?: { audio?: string; mime?: string }) => {
const name = errName(e);    if (serverAudio?.audio && serverAudio?.mime) {
const name = errName(e);      try {
const name = errName(e);        await playServerAudio(serverAudio.audio, serverAudio.mime);
const name = errName(e);        return;
const name = errName(e);      } catch (e) {
const name = errName(e);        console.warn("Server audio playback failed, falling back", e);
const name = errName(e);      }
const name = errName(e);    }
const name = errName(e);    speakBrowser(text);
const name = errName(e);  };
const name = errName(e);
const name = errName(e);  const pausePlayback = () => {
const name = errName(e);    if (ttsModeRef.current === "audio" && audioRef.current) {
const name = errName(e);      audioRef.current.pause();
const name = errName(e);      setPlayState("paused");
const name = errName(e);    } else if (ttsModeRef.current === "browser" && "speechSynthesis" in window) {
const name = errName(e);      speechSynthesis.pause();
const name = errName(e);      setPlayState("paused");
const name = errName(e);    }
const name = errName(e);  };
const name = errName(e);
const name = errName(e);  const resumePlayback = () => {
const name = errName(e);    if (ttsModeRef.current === "audio" && audioRef.current) {
const name = errName(e);      void audioRef.current.play();
const name = errName(e);      setPlayState("playing");
const name = errName(e);    } else if (ttsModeRef.current === "browser" && "speechSynthesis" in window) {
const name = errName(e);      speechSynthesis.resume();
const name = errName(e);      setPlayState("playing");
const name = errName(e);    }
const name = errName(e);  };
const name = errName(e);
const name = errName(e);  const stopPlayback = () => {
const name = errName(e);    if (audioRef.current) {
const name = errName(e);      try { audioRef.current.pause(); audioRef.current.currentTime = 0; } catch {}
const name = errName(e);    }
const name = errName(e);    if ("speechSynthesis" in window) {
const name = errName(e);      try { speechSynthesis.cancel(); } catch {}
const name = errName(e);    }
const name = errName(e);    ttsModeRef.current = null;
const name = errName(e);    setPlayState("idle");
const name = errName(e);  };
const name = errName(e);
const name = errName(e);  // Prime voices list (Chrome loads async)
const name = errName(e);  useEffect(() => {
const name = errName(e);    if (!("speechSynthesis" in window)) return;
const name = errName(e);    const load = () => speechSynthesis.getVoices();
const name = errName(e);    load();
const name = errName(e);    speechSynthesis.onvoiceschanged = load;
const name = errName(e);  }, []);
const name = errName(e);
const name = errName(e);  const sendToBot = async (payload: { audio?: string; mime?: string; text?: string }) => {
const name = errName(e);    const { data, error } = await supabase.functions.invoke("voice-bot", {
const name = errName(e);      body: { ...payload, language: voiceLang, profile: active },
const name = errName(e);    });
const name = errName(e);    if (error) {
const name = errName(e);      setDiag((d) => ({ ...d, lastStatus: `error: ${error.message || "invoke failed"}` }));
const name = errName(e);      throw new Error(error.message || "Voice bot failed");
const name = errName(e);    }
const name = errName(e);    if (!data) throw new Error("No response from voice bot");
const name = errName(e);    const d = data as any;
const name = errName(e);    setDiag((prev) => ({ ...prev, ...(d.diagnostics || {}), lastStatus: "ok" }));
const name = errName(e);    if (d.error && !d.reply) throw new Error(d.error);
const name = errName(e);    return {
const name = errName(e);      transcript: d.transcript,
const name = errName(e);      reply: d.reply,
const name = errName(e);      audio: d.audio_reply || d.audio,
const name = errName(e);      audioMime: d.audio_mime || d.audioMime,
const name = errName(e);    } as { transcript: string; reply: string; audio?: string; audioMime?: string };
const name = errName(e);  };
const name = errName(e);
const name = errName(e);  // ───── Path A: Browser SpeechRecognition (Chrome/Edge desktop, Android) ─────
const name = errName(e);  const startBrowserSTT = () => {
const name = errName(e);    const SR = getBrowserSTT();
const name = errName(e);    if (!SR) return false;
const name = errName(e);    try {
const name = errName(e);      const rec = new SR();
const name = errName(e);      rec.lang = LANG_BCP[voiceLang] || "en-IN";
const name = errName(e);      rec.interimResults = false;
const name = errName(e);      rec.continuous = false;
const name = errName(e);      rec.maxAlternatives = 1;
const name = errName(e);
const name = errName(e);      let finalText = "";
const name = errName(e);      let usingRecorderFallback = false;
const name = errName(e);      let confidenceSum = 0, confidenceN = 0;
const name = errName(e);      rec.onresult = (ev: any) => {
const name = errName(e);        for (let i = ev.resultIndex; i < ev.results.length; i++) {
const name = errName(e);          if (ev.results[i].isFinal) {
const name = errName(e);            finalText += ev.results[i][0].transcript;
const name = errName(e);            const c = ev.results[i][0].confidence;
const name = errName(e);            if (typeof c === "number" && c > 0) { confidenceSum += c; confidenceN++; }
const name = errName(e);          }
const name = errName(e);        }
const name = errName(e);      };
const name = errName(e);      rec.onerror = (ev: any) => {
const name = errName(e);        setRecording(false);
const name = errName(e);        recognitionRef.current = null;
const name = errName(e);        if (ev.error === "not-allowed") {
const name = errName(e);          setError("Microphone permission denied — enable it in browser settings.");
const name = errName(e);          toast.error("Microphone permission denied");
const name = errName(e);        } else if (ev.error === "no-speech" || ev.error === "audio-capture") {
const name = errName(e);          usingRecorderFallback = true;
const name = errName(e);          toast.message("Didn't hear clearly — opening recorder mode");
const name = errName(e);          void startRecording();
const name = errName(e);        } else if (ev.error === "network" || ev.error === "service-not-allowed") {
const name = errName(e);          usingRecorderFallback = true;
const name = errName(e);          toast.message("Browser speech service failed — using Krishi recorder");
const name = errName(e);          void startRecording();
const name = errName(e);        } else {
const name = errName(e);          toast.error(`Voice error: ${ev.error}`);
const name = errName(e);        }
const name = errName(e);      };
const name = errName(e);      rec.onend = async () => {
const name = errName(e);        if (usingRecorderFallback) return;
const name = errName(e);        setRecording(false);
const name = errName(e);        recognitionRef.current = null;
const name = errName(e);        if (!finalText.trim()) return;
const name = errName(e);        setProcessing(true);
const name = errName(e);        const conf = confidenceN > 0 ? confidenceSum / confidenceN : null;
const name = errName(e);        setDiag((d) => ({ ...d, sttProvider: "browser", sttConfidence: conf }));
const name = errName(e);        try {
const name = errName(e);          const r = await sendToBot({ text: finalText });
const name = errName(e);          setHistory([{ role: "user", text: r.transcript }, { role: "assistant", text: r.reply }]);
const name = errName(e);          speak(r.reply, { audio: r.audio, mime: r.audioMime });
const name = errName(e);        } catch (e: unknown) {
const name = errName(e);          toast.error(errMsg(e, "Could not get reply"));
const name = errName(e);        } finally {
const name = errName(e);          setProcessing(false);
const name = errName(e);        }
const name = errName(e);      };
const name = errName(e);      // start() must be called synchronously inside the user click handler
const name = errName(e);      rec.start();
const name = errName(e);      recognitionRef.current = rec;
const name = errName(e);      setRecording(true);
const name = errName(e);      setError(null);
const name = errName(e);      return true;
const name = errName(e);    } catch (e: unknown) {
const name = errName(e);      console.warn("Browser STT failed to start, falling back to MediaRecorder", e);
const name = errName(e);      return false;
const name = errName(e);    }
const name = errName(e);  };
const name = errName(e);
const name = errName(e);  // ───── Path B: MediaRecorder → Whisper (Safari, Firefox, others) ─────
const name = errName(e);  const startRecording = async () => {
const name = errName(e);    try {
const name = errName(e);      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
const name = errName(e);      streamRef.current = stream;
const name = errName(e);      const mimeType = pickMimeType();
const name = errName(e);      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
const name = errName(e);      mediaRecorder.current = mr;
const name = errName(e);      chunks.current = [];
const name = errName(e);      mr.ondataavailable = (e) => {
const name = errName(e);        if (e.data.size > 0) chunks.current.push(e.data);
const name = errName(e);      };
const name = errName(e);      mr.onstop = () => handleStop();
const name = errName(e);      mr.start();
const name = errName(e);      setRecording(true);
const name = errName(e);      setError(null);
const name = errName(e);    } catch (e: unknown) {
const name = errName(e);      const name = e?.name || "";
const name = errName(e);      if (name === "NotAllowedError") {
const name = errName(e);        setError("Microphone blocked. Allow it in your browser address bar then retry.");
const name = errName(e);        toast.error("Microphone blocked");
const name = errName(e);      } else if (name === "NotFoundError") {
const name = errName(e);        setError("No microphone found on this device.");
const name = errName(e);        toast.error("No microphone found");
const name = errName(e);      } else if (name === "NotSupportedError") {
const name = errName(e);        setError("Audio recording not supported. Try Chrome on desktop or Android.");
const name = errName(e);        toast.error("Recording not supported");
const name = errName(e);      } else {
const name = errName(e);        setError(errMsg(e, "Could not access microphone"));
const name = errName(e);        toast.error("Microphone error");
const name = errName(e);      }
const name = errName(e);    }
const name = errName(e);  };
const name = errName(e);
const name = errName(e);  const handleStart = () => {
const name = errName(e);    setError(null);
const name = errName(e);    stopPlayback();
const name = errName(e);    setHistory([]);
const name = errName(e);    // Try the gesture-friendly browser STT first
const name = errName(e);    if (!startBrowserSTT()) {
const name = errName(e);      void startRecording();
const name = errName(e);    }
const name = errName(e);  };
const name = errName(e);
const name = errName(e);  const handleStop = async () => {
const name = errName(e);    cleanupStream();
const name = errName(e);    setRecording(false);
const name = errName(e);    if (chunks.current.length === 0) return;
const name = errName(e);    setProcessing(true);
const name = errName(e);    try {
const name = errName(e);      const mr = mediaRecorder.current;
const name = errName(e);      const mime = mr?.mimeType || "audio/webm";
const name = errName(e);      const blob = new Blob(chunks.current, { type: mime });
const name = errName(e);      const buf = await blob.arrayBuffer();
const name = errName(e);      const bytes = new Uint8Array(buf);
const name = errName(e);      // Chunked btoa to avoid stack overflow on large blobs
const name = errName(e);      let binary = "";
const name = errName(e);      const chunkSize = 0x8000;
const name = errName(e);      for (let i = 0; i < bytes.length; i += chunkSize) {
const name = errName(e);        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
const name = errName(e);      }
const name = errName(e);      const b64 = btoa(binary);
const name = errName(e);
const name = errName(e);      const r = await sendToBot({ audio: b64, mime });
const name = errName(e);      setHistory([{ role: "user", text: r.transcript }, { role: "assistant", text: r.reply }]);
const name = errName(e);      speak(r.reply, { audio: r.audio, mime: r.audioMime });
const name = errName(e);    } catch (e: unknown) {
const name = errName(e);      setError("Voice network failed. I saved your mic access; please try once more in a few seconds.");
const name = errName(e);      toast.error(errMsg(e, "Voice processing failed"));
const name = errName(e);    } finally {
const name = errName(e);      setProcessing(false);
const name = errName(e);    }
const name = errName(e);  };
const name = errName(e);
const name = errName(e);  const stopAll = () => {
const name = errName(e);    if (recognitionRef.current) {
const name = errName(e);      try { recognitionRef.current.stop(); } catch {}
const name = errName(e);      recognitionRef.current = null;
const name = errName(e);      setRecording(false);
const name = errName(e);      return;
const name = errName(e);    }
const name = errName(e);    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
const name = errName(e);      mediaRecorder.current.stop();
const name = errName(e);    } else {
const name = errName(e);      cleanupStream();
const name = errName(e);      setRecording(false);
const name = errName(e);    }
const name = errName(e);  };
const name = errName(e);
const name = errName(e);  return (
const name = errName(e);    <>
const name = errName(e);      {/* Floating bubble */}
const name = errName(e);      <motion.button
const name = errName(e);        initial={{ scale: 0, opacity: 0 }}
const name = errName(e);        animate={{ scale: 1, opacity: 1 }}
const name = errName(e);        transition={{ delay: 1, type: "spring", stiffness: 200 }}
const name = errName(e);        whileHover={{ scale: 1.12 }}
const name = errName(e);        whileTap={{ scale: 0.95 }}
const name = errName(e);        onClick={() => setOpen(!open)}
const name = errName(e);        className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-green-600 to-emerald-700 text-white shadow-2xl shadow-green-500/30 flex items-center justify-center"
const name = errName(e);        aria-label="Voice assistant"
const name = errName(e);      >
const name = errName(e);        {!open && (
const name = errName(e);          <span className="absolute inset-0 rounded-full bg-green-500/30 animate-ping" />
const name = errName(e);        )}
const name = errName(e);        <Mic className="h-6 w-6 relative z-10" />
const name = errName(e);        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center">
const name = errName(e);          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
const name = errName(e);        </span>
const name = errName(e);      </motion.button>
const name = errName(e);
const name = errName(e);      <AnimatePresence>
const name = errName(e);        {open && (
const name = errName(e);          <motion.div
const name = errName(e);            initial={{ opacity: 0, y: 20, scale: 0.9 }}
const name = errName(e);            animate={{ opacity: 1, y: 0, scale: 1 }}
const name = errName(e);            exit={{ opacity: 0, y: 20, scale: 0.9 }}
const name = errName(e);            className="fixed bottom-44 right-6 z-40 w-[340px] max-w-[90vw] rounded-3xl overflow-hidden shadow-2xl border border-border bg-card"
const name = errName(e);          >
const name = errName(e);            {/* Header */}
const name = errName(e);            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-br from-green-700 to-emerald-800 text-white">
const name = errName(e);              <div className="flex items-center gap-2.5 min-w-0">
const name = errName(e);                <div className="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0">
const name = errName(e);                  <Sparkles className="h-4 w-4" />
const name = errName(e);                </div>
const name = errName(e);                <div className="min-w-0">
const name = errName(e);                  <div className="font-display font-semibold text-sm leading-tight">Krishi Voice</div>
const name = errName(e);                  <div className="text-[10px] text-white/80 leading-tight">
const name = errName(e);                    {recording ? "● Suno raha hoon..." : processing ? "● Soch raha hoon..." : "13 Indian languages"}
const name = errName(e);                  </div>
const name = errName(e);                </div>
const name = errName(e);              </div>
const name = errName(e);              <div className="flex items-center gap-1">
const name = errName(e);                <button onClick={() => setShowDiag((s) => !s)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors" aria-label="Diagnostics">
const name = errName(e);                  <Activity className="h-4 w-4" />
const name = errName(e);                </button>
const name = errName(e);                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors" aria-label="Close">
const name = errName(e);                  <X className="h-4 w-4" />
const name = errName(e);                </button>
const name = errName(e);              </div>
const name = errName(e);            </div>
const name = errName(e);
const name = errName(e);            <div className="p-4 space-y-3">
const name = errName(e);              {/* Language picker */}
const name = errName(e);              <div className="flex items-center gap-2">
const name = errName(e);                <Settings2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
const name = errName(e);                <select
const name = errName(e);                  value={voiceLang}
const name = errName(e);                  onChange={(e) => setVoiceLang(e.target.value)}
const name = errName(e);                  className="w-full text-xs rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
const name = errName(e);                >
const name = errName(e);                  <option value="en">English</option>
const name = errName(e);                  <option value="hi">हिन्दी (Hindi)</option>
const name = errName(e);                  <option value="bn">বাংলা (Bengali)</option>
const name = errName(e);                  <option value="ta">தமிழ் (Tamil)</option>
const name = errName(e);                  <option value="te">తెలుగు (Telugu)</option>
const name = errName(e);                  <option value="mr">मराठी (Marathi)</option>
const name = errName(e);                  <option value="gu">ગુજરાતી (Gujarati)</option>
const name = errName(e);                  <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
const name = errName(e);                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
const name = errName(e);                  <option value="ml">മലയാളം (Malayalam)</option>
const name = errName(e);                  <option value="or">ଓଡ଼ିଆ (Odia)</option>
const name = errName(e);                  <option value="as">অসমীয়া (Assamese)</option>
const name = errName(e);                  <option value="ur">اردو (Urdu)</option>
const name = errName(e);                </select>
const name = errName(e);              </div>
const name = errName(e);
const name = errName(e);              {showDiag && (
const name = errName(e);                <div className="p-2 rounded-xl bg-muted/40 text-[10px] space-y-0.5">
const name = errName(e);                  <div>🎤 Mic permission: <b>{diag.micPermission || "unknown"}</b></div>
const name = errName(e);                  <div>🛰 STT path: <b>{diag.sttProvider || "—"}</b>{typeof diag.sttConfidence === "number" ? ` · conf ${(diag.sttConfidence * 100).toFixed(0)}%` : ""}</div>
const name = errName(e);                  <div>🤖 Chat: <b>{diag.chatProvider || "—"}</b></div>
const name = errName(e);                  <div>🎧 Audio mime: <b>{diag.audioMime || "—"}</b></div>
const name = errName(e);                  <div>📡 Last: <b>{diag.lastStatus || "—"}</b></div>
const name = errName(e);                  {diag.sttError && <div className="text-destructive">⚠ {diag.sttError}</div>}
const name = errName(e);                </div>
const name = errName(e);              )}
const name = errName(e);
const name = errName(e);              {error && (
const name = errName(e);                <div className="flex items-start gap-2 p-2 rounded-xl bg-destructive/10 text-destructive text-[11px]">
const name = errName(e);                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
const name = errName(e);                  <span>{error}</span>
const name = errName(e);                </div>
const name = errName(e);              )}
const name = errName(e);
const name = errName(e);              {/* Suggestion chips */}
const name = errName(e);              {!recording && !processing && history.length === 0 && (
const name = errName(e);                <div className="space-y-1.5">
const name = errName(e);                  <p className="text-[10px] text-muted-foreground font-medium">Quick questions:</p>
const name = errName(e);                  <div className="flex flex-wrap gap-1.5">
const name = errName(e);                    {[
const name = errName(e);                      "🌤️ Aaj kya kaam karoon?",
const name = errName(e);                      "💊 Meri fasal ko kya spray karoon?",
const name = errName(e);                      "💰 Rice ka bhav kya hai?",
const name = errName(e);                      "🌧️ Barish kab hogi?",
const name = errName(e);                    ].map((q) => (
const name = errName(e);                      <button
const name = errName(e);                        key={q}
const name = errName(e);                        onClick={() => {
const name = errName(e);                          handleStart();
const name = errName(e);                          window.dispatchEvent(new CustomEvent("krishi-prefill", { detail: { text: q } }));
const name = errName(e);                        }}
const name = errName(e);                        className="text-[10px] px-2.5 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors font-medium"
const name = errName(e);                      >
const name = errName(e);                        {q}
const name = errName(e);                      </button>
const name = errName(e);                    ))}
const name = errName(e);                  </div>
const name = errName(e);                </div>
const name = errName(e);              )}
const name = errName(e);
const name = errName(e);              {/* Chat history */}
const name = errName(e);              <div className="max-h-40 overflow-y-auto space-y-2 text-xs">
const name = errName(e);                {history.length === 0 && !recording && !processing && (
const name = errName(e);                  <p className="text-muted-foreground italic text-center py-2 text-[11px]">
const name = errName(e);                    🎙️ Mic tap karein — Hindi, English, ya koi bhi 13 bhasha mein baat karein
const name = errName(e);                  </p>
const name = errName(e);                )}
const name = errName(e);                {history.slice(-6).map((m, i) => (
const name = errName(e);                  <motion.div
const name = errName(e);                    key={i}
const name = errName(e);                    initial={{ opacity: 0, y: 4 }}
const name = errName(e);                    animate={{ opacity: 1, y: 0 }}
const name = errName(e);                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
const name = errName(e);                  >
const name = errName(e);                    <div className={`max-w-[85%] p-2.5 rounded-2xl ${
const name = errName(e);                      m.role === "user"
const name = errName(e);                        ? "bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-br-sm"
const name = errName(e);                        : "bg-muted text-foreground rounded-bl-sm"
const name = errName(e);                    }`}>
const name = errName(e);                      {m.role === "assistant" && <span className="mr-1">🌾</span>}
const name = errName(e);                      {m.text}
const name = errName(e);                    </div>
const name = errName(e);                  </motion.div>
const name = errName(e);                ))}
const name = errName(e);              </div>
const name = errName(e);
const name = errName(e);              {/* Mic area */}
const name = errName(e);              <div className="flex flex-col items-center gap-2 pt-1">
const name = errName(e);                {recording && (
const name = errName(e);                  <div className="flex items-end justify-center gap-1 h-10">
const name = errName(e);                    {WAVE_BARS.map((_, i) => (
const name = errName(e);                      <span
const name = errName(e);                        key={i}
const name = errName(e);                        className="wave-bar w-1 bg-gradient-to-t from-green-600 to-emerald-400 rounded-full origin-bottom"
const name = errName(e);                        style={{ height: `${20 + (i % 3) * 8}px`, animationDelay: `${i * 80}ms` }}
const name = errName(e);                      />
const name = errName(e);                    ))}
const name = errName(e);                  </div>
const name = errName(e);                )}
const name = errName(e);
const name = errName(e);                {processing && !recording && (
const name = errName(e);                  <div className="flex items-center gap-2 text-xs text-primary">
const name = errName(e);                    <Loader2 className="h-4 w-4 animate-spin" />
const name = errName(e);                    <span>KrishiMitra soch raha hai...</span>
const name = errName(e);                  </div>
const name = errName(e);                )}
const name = errName(e);
const name = errName(e);                {!processing && (
const name = errName(e);                  <button
const name = errName(e);                    onClick={recording ? stopAll : handleStart}
const name = errName(e);                    className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 ${
const name = errName(e);                      recording
const name = errName(e);                        ? "bg-destructive text-destructive-foreground animate-pulse"
const name = errName(e);                        : "bg-gradient-to-br from-green-600 to-emerald-700 text-white"
const name = errName(e);                    }`}
const name = errName(e);                    aria-label={recording ? "Stop" : "Record"}
const name = errName(e);                  >
const name = errName(e);                    {recording ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
const name = errName(e);                  </button>
const name = errName(e);                )}
const name = errName(e);
const name = errName(e);                <p className="text-[10px] text-muted-foreground text-center">
const name = errName(e);                  {recording ? "Tap to stop" : processing ? "Please wait…" : playState === "playing" ? "Playing reply…" : "Tap mic · Ask in any language"}
const name = errName(e);                </p>
const name = errName(e);
const name = errName(e);                {playState !== "idle" && !recording && !processing && (
const name = errName(e);                  <div className="flex items-center gap-2">
const name = errName(e);                    {playState === "playing" ? (
const name = errName(e);                      <button onClick={pausePlayback} className="px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-foreground text-xs font-medium flex items-center gap-1.5">
const name = errName(e);                        <Pause className="h-3.5 w-3.5" /> Pause
const name = errName(e);                      </button>
const name = errName(e);                    ) : (
const name = errName(e);                      <button onClick={resumePlayback} className="px-3 py-1.5 rounded-full bg-primary/15 hover:bg-primary/25 text-primary text-xs font-medium flex items-center gap-1.5">
const name = errName(e);                        <Play className="h-3.5 w-3.5" /> Resume
const name = errName(e);                      </button>
const name = errName(e);                    )}
const name = errName(e);                    <button onClick={stopPlayback} className="px-3 py-1.5 rounded-full bg-destructive/15 hover:bg-destructive/25 text-destructive text-xs font-medium flex items-center gap-1.5">
const name = errName(e);                      <Square className="h-3.5 w-3.5" /> Stop
const name = errName(e);                    </button>
const name = errName(e);                  </div>
const name = errName(e);                )}
const name = errName(e);              </div>
const name = errName(e);            </div>
const name = errName(e);          </motion.div>
const name = errName(e);        )}
const name = errName(e);      </AnimatePresence>
const name = errName(e);
const name = errName(e);      <audio ref={audioRef} hidden />
const name = errName(e);    </>
const name = errName(e);  );
const name = errName(e);}
const name = errName(e);
