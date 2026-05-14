import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM = `You are KrishiMitra Voice — a warm, human, village-wise agricultural advisor for Indian farmers.
RULES:
- Reply in the EXACT language the user spoke. If user wrote in English, reply in English. If Hindi, reply in Hindi. Etc.
- Keep replies short and natural (2-4 spoken sentences). They will be read aloud.
- Sound like a caring real person — calm, warm, lightly encouraging, sometimes a tiny village proverb. NEVER robotic.
- Always give ONE specific next step with a number (kg/acre, litres, days, ₹) when possible.
- Reference the farmer's profile data when given (name, district, soil, crops).`;

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function extFor(mime: string): string {
  if (!mime) return "webm";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")) return "m4a";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  return "webm";
}

type STTResult = { text: string; provider: string; error?: string };

// OpenAI Whisper — best quality, especially for Indian languages
async function transcribeWithOpenAI(audioBytes: Uint8Array, mime: string, language: string): Promise<STTResult> {
  const KEY = Deno.env.get("OPENAI_API_KEY");
  if (!KEY) return { text: "", provider: "openai", error: "OpenAI key missing" };
  const ext = extFor(mime);
  const fd = new FormData();
  fd.append("file", new Blob([audioBytes], { type: mime || "audio/webm" }), `audio.${ext}`);
  fd.append("model", "whisper-1");
  if (language && language !== "auto") fd.append("language", language);

  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}` },
    body: fd,
  });
  if (!r.ok) {
    const t = await r.text();
    return { text: "", provider: "openai", error: `OpenAI ${r.status}: ${t.slice(0, 180)}` };
  }
  const j = await r.json();
  return { text: j.text || "", provider: "openai-whisper" };
}

async function transcribeWithGroq(audioBytes: Uint8Array, mime: string, language: string): Promise<STTResult> {
  const GROQ_KEY = Deno.env.get("Groq_api_key_Rahul");
  if (!GROQ_KEY) return { text: "", provider: "groq", error: "Groq API key missing" };

  const ext = extFor(mime);
  const fd = new FormData();
  fd.append("file", new Blob([audioBytes], { type: mime || "audio/webm" }), `audio.${ext}`);
  fd.append("model", "whisper-large-v3");
  if (language && language !== "auto") fd.append("language", language);

  const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_KEY}` },
    body: fd,
  });

  if (!r.ok) {
    const t = await r.text();
    return { text: "", provider: "groq", error: `Groq ${r.status}: ${t.slice(0, 180)}` };
  }
  const j = await r.json();
  return { text: j.text || "", provider: "groq" };
}

async function transcribeWithHuggingFace(audioBytes: Uint8Array, mime: string): Promise<STTResult> {
  const HF_KEY = Deno.env.get("Hugging_face_token");
  if (!HF_KEY) return { text: "", provider: "huggingface", error: "Hugging Face token missing" };
  const urls = [
    "https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3",
    "https://api-inference.huggingface.co/models/openai/whisper-large-v3",
  ];
  let lastErr = "";
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${HF_KEY}`, "Content-Type": mime || "audio/webm" },
        body: audioBytes,
      });
      if (!r.ok) { lastErr = `HF ${r.status} @ ${url}`; continue; }
      const j = await r.json();
      const text = j.text || j?.[0]?.text || "";
      if (text) return { text, provider: "huggingface" };
    } catch (e: any) { lastErr = `HF exception: ${e?.message || e}`; }
  }
  return { text: "", provider: "huggingface", error: lastErr || "HF transcription failed" };
}

async function transcribeAudio(audioBytes: Uint8Array, mime: string, language: string): Promise<STTResult> {
  // Priority: OpenAI Whisper → Groq → Hugging Face
  const o = await transcribeWithOpenAI(audioBytes, mime, language);
  if (o.text) return o;
  console.warn("[voice-bot] OpenAI STT failed:", o.error);
  const a = await transcribeWithGroq(audioBytes, mime, language);
  if (a.text) return a;
  console.warn("[voice-bot] Groq STT failed:", a.error);
  const b = await transcribeWithHuggingFace(audioBytes, mime);
  if (b.text) return b;
  console.warn("[voice-bot] HF STT failed:", b.error);
  return { text: "", provider: "none", error: `${o.error || ""} | ${a.error || ""} | ${b.error || ""}` };
}

// ChatGPT-style TTS via OpenAI tts-1-hd (returns base64 mp3)
async function synthesizeWithOpenAI(text: string, language: string): Promise<{ audioBase64: string; voice: string } | null> {
  const KEY = Deno.env.get("OPENAI_API_KEY");
  if (!KEY || !text.trim()) return null;
  // Pick a warm voice. "shimmer" is calm/feminine, "onyx" deep/masculine, "nova" friendly. Default: nova.
  const voice = "nova";
  try {
    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "tts-1-hd",
        voice,
        input: text.slice(0, 4000),
        format: "mp3",
        speed: 0.95,
      }),
    });
    if (!r.ok) {
      console.warn("[voice-bot] OpenAI TTS failed:", r.status, (await r.text()).slice(0, 160));
      return null;
    }
    const buf = new Uint8Array(await r.arrayBuffer());
    // chunked base64 to avoid stack overflow
    let bin = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < buf.length; i += CHUNK) bin += String.fromCharCode(...buf.subarray(i, i + CHUNK));
    return { audioBase64: btoa(bin), voice };
  } catch (e) {
    console.warn("[voice-bot] OpenAI TTS exception:", e);
    return null;
  }
}

async function chatWithLovable(userText: string, profile: any, language: string): Promise<string> {
  const KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!KEY) throw new Error("LOVABLE_API_KEY missing");

  const profileLine = profile
    ? `Farmer: ${profile.full_name || "Friend"}, ${profile.farm_location || profile?.farmer_details?.district || "India"}. Soil: ${profile.soil_type || profile?.farmer_details?.soil_type || "?"}. Crops: ${profile?.farmer_details?.current_crops || "?"}. Land: ${profile?.farmer_details?.total_land || profile.farm_size || "?"} acres.`
    : "";

  const langLine = language && language !== "auto"
    ? `The user's spoken language is "${language}". Reply in that exact language.`
    : "Match the user's language exactly.";

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: `${SYSTEM}\n${langLine}\n${profileLine}` },
        { role: "user", content: userText },
      ],
      temperature: 0.75,
      max_tokens: 320,
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Lovable AI ${r.status}: ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  return j.choices?.[0]?.message?.content || "";
}

async function chatWithGroq(userText: string, profile: any, language: string): Promise<string> {
  const KEY = Deno.env.get("Groq_api_key_Rahul");
  if (!KEY) throw new Error("Groq key missing");
  const profileLine = profile
    ? `Farmer: ${profile.full_name || "Friend"}, ${profile.farm_location || "India"}.`
    : "";
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: `${SYSTEM}\nLanguage: ${language}.\n${profileLine}` },
        { role: "user", content: userText },
      ],
      temperature: 0.7,
      max_tokens: 280,
    }),
  });
  if (!r.ok) throw new Error(`Groq ${r.status}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content || "";
}

async function chatWithFallback(userText: string, profile: any, language: string): Promise<{ reply: string; provider: string }> {
  try {
    const t = await chatWithLovable(userText, profile, language);
    if (t.trim()) return { reply: t, provider: "lovable" };
  } catch (e) { console.warn("[voice-bot] Lovable chat failed", e); }
  try {
    const t = await chatWithGroq(userText, profile, language);
    if (t.trim()) return { reply: t, provider: "groq" };
  } catch (e) { console.warn("[voice-bot] Groq chat failed", e); }
  return {
    reply: "I heard you, friend, but my AI link is weak right now. Please try again in a few seconds — meanwhile, check today's weather and your soil moisture.",
    provider: "fallback",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { audio, mime, language, profile, text: directText, transcribeOnly, tts: ttsRequested } = body;
    const lang = (language || "en").toString();
    const wantsTTS = ttsRequested !== false; // default ON when OPENAI_API_KEY exists

    let transcript = "";
    let sttProvider = "browser";
    let sttError: string | undefined;

    if (directText && typeof directText === "string" && directText.trim()) {
      transcript = directText.trim();
    } else if (audio) {
      const bytes = base64ToBytes(audio);
      const stt = await transcribeAudio(bytes, mime || "audio/webm", lang);
      transcript = stt.text;
      sttProvider = stt.provider;
      sttError = stt.error;
    } else {
      return new Response(JSON.stringify({ error: "Provide either 'audio' (base64) or 'text'" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!transcript.trim()) {
      return new Response(JSON.stringify({
        transcript: "",
        reply: "I couldn't catch your voice clearly. Please try again — speak close to the mic in a quiet spot.",
        diagnostics: { sttProvider, sttError, audioMime: mime, language: lang },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (transcribeOnly) {
      return new Response(JSON.stringify({
        transcript,
        diagnostics: { sttProvider, sttError, audioMime: mime, language: lang },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { reply, provider: chatProvider } = await chatWithFallback(transcript, profile, lang);

    // ChatGPT-quality voice (best-effort; never blocks reply)
    let audio_reply: string | null = null;
    let ttsProvider: string | null = null;
    if (wantsTTS && reply) {
      const tts = await synthesizeWithOpenAI(reply, lang);
      if (tts) { audio_reply = tts.audioBase64; ttsProvider = `openai:${tts.voice}`; }
    }

    return new Response(JSON.stringify({
      transcript,
      reply,
      audio_reply,            // base64 mp3 or null — client plays via data URI
      audio_mime: audio_reply ? "audio/mpeg" : null,
      diagnostics: { sttProvider, sttError, chatProvider, ttsProvider, audioMime: mime, language: lang },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("voice-bot error:", e?.message || e);
    return new Response(JSON.stringify({
      error: e?.message || "Voice processing failed",
      reply: "Something went wrong on our side. Please try again — your mic permission is still saved.",
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
