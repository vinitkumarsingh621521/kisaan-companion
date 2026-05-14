import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM = `You are KrishiMitra Voice — a warm, human, village-wise agricultural advisor for Indian farmers. The user spoke to you. Reply in the EXACT same language they used. Keep replies short (2-4 sentences) because they will be spoken aloud. Sound like a caring real person: calm, practical, lightly encouraging, never robotic. Give one specific next step with quantities/timing when possible. Reference the farmer's profile data when given.`;

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

async function transcribeWithGroq(audioBytes: Uint8Array, mime: string, language: string): Promise<string> {
  const GROQ_KEY = Deno.env.get("Groq_api_key_Rahul");
  if (!GROQ_KEY) throw new Error("Groq API key missing");

  const ext = extFor(mime);
  const fd = new FormData();
  fd.append("file", new Blob([audioBytes], { type: mime || "audio/webm" }), `audio.${ext}`);
  fd.append("model", "whisper-large-v3");
  if (language && language !== "en") {
    fd.append("language", language);
  }

  const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_KEY}` },
    body: fd,
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Whisper failed (${r.status}): ${t.slice(0, 300)}`);
  }
  const j = await r.json();
  return j.text || "";
}

async function transcribeWithHuggingFace(audioBytes: Uint8Array, mime: string): Promise<string> {
  const HF_KEY = Deno.env.get("Hugging_face_token");
  if (!HF_KEY) throw new Error("Hugging Face token missing");

  const r = await fetch("https://api-inference.huggingface.co/models/openai/whisper-large-v3", {
    method: "POST",
    headers: { Authorization: `Bearer ${HF_KEY}`, "Content-Type": mime || "audio/webm" },
    body: audioBytes,
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`HF transcription failed (${r.status}): ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  return j.text || j?.[0]?.text || "";
}

async function transcribeAudio(audioBytes: Uint8Array, mime: string, language: string): Promise<string> {
  try {
    return await transcribeWithGroq(audioBytes, mime, language);
  } catch (e) {
    console.warn("[voice-bot] Groq transcription failed, trying Hugging Face", e);
    return await transcribeWithHuggingFace(audioBytes, mime);
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

// Groq PlayAI TTS — only English/Arabic voices currently. For Indian languages we let client use browser TTS.
async function ttsWithGroq(text: string, language: string): Promise<{ audio: string; mime: string } | null> {
  const GROQ_KEY = Deno.env.get("Groq_api_key_Rahul");
  if (!GROQ_KEY) return null;
  // Only attempt for English — Groq playai-tts does not yet support Indic languages well
  if (language && language !== "en") return null;
  try {
    const r = await fetch("https://api.groq.com/openai/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "playai-tts",
        voice: "Fritz-PlayAI",
        input: text.slice(0, 800),
        response_format: "wav",
      }),
    });
    if (!r.ok) {
      console.warn("[voice-bot] Groq TTS failed", r.status);
      return null;
    }
    const buf = new Uint8Array(await r.arrayBuffer());
    return { audio: bytesToBase64(buf), mime: "audio/wav" };
  } catch (e) {
    console.warn("[voice-bot] Groq TTS error", e);
    return null;
  }
}

async function chatWithGroq(userText: string, profile: any): Promise<string> {
  const GROQ_KEY = Deno.env.get("Groq_api_key_Rahul");
  if (!GROQ_KEY) throw new Error("Groq API key missing");

  const profileLine = profile
    ? `Farmer: ${profile.full_name || "Friend"}, ${profile.farm_location || "India"}. Soil: ${profile.soil_type || "?"}. Crops: ${profile?.farmer_details?.current_crops || "?"}.`
    : "";

  const messages = [
    { role: "system", content: `${SYSTEM}\n\n${profileLine}` },
    { role: "user", content: userText },
  ];

  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.7,
      max_tokens: 320,
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Groq chat failed (${r.status}): ${t.slice(0, 300)}`);
  }
  const j = await r.json();
  return j.choices?.[0]?.message?.content || "";
}

async function chatWithLovable(userText: string, profile: any): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("Lovable AI key missing");

  const profileLine = profile
    ? `Farmer: ${profile.full_name || "Friend"}, ${profile.farm_location || "India"}. Soil: ${profile.soil_type || profile?.farmer_details?.soil_type || "?"}. Crops: ${profile?.farmer_details?.current_crops || "?"}.`
    : "";

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: `${SYSTEM}\n\n${profileLine}` },
        { role: "user", content: userText },
      ],
      temperature: 0.65,
      max_tokens: 280,
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Lovable AI failed (${r.status}): ${t.slice(0, 300)}`);
  }
  const j = await r.json();
  return j.choices?.[0]?.message?.content || "";
}

async function chatWithFallback(userText: string, profile: any): Promise<string> {
  try {
    const reply = await chatWithLovable(userText, profile);
    if (reply.trim()) return reply;
  } catch (e) {
    console.warn("[voice-bot] Lovable AI chat failed, trying Groq", e);
  }
  try {
    const reply = await chatWithGroq(userText, profile);
    if (reply.trim()) return reply;
  } catch (e) {
    console.warn("[voice-bot] Groq chat failed", e);
  }
  return "I heard you, but my AI network is weak right now. For safety, check today’s crop, soil moisture, and weather first — then ask me again in a minute, dost.";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { audio, mime, language, profile, text: directText } = body;

    let transcript = "";

    if (directText && typeof directText === "string" && directText.trim()) {
      // Browser STT path — skip Whisper
      transcript = directText.trim();
    } else if (audio) {
      const bytes = base64ToBytes(audio);
      transcript = await transcribeWithGroq(bytes, mime || "audio/webm", language || "en");
    } else {
      return new Response(JSON.stringify({ error: "Provide either 'audio' (base64) or 'text'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!transcript.trim()) {
      return new Response(
        JSON.stringify({ transcript: "", reply: "Sorry, I didn't catch that. Please try again." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reply = await chatWithGroq(transcript, profile);
    const tts = await ttsWithGroq(reply, language || "en");

    return new Response(JSON.stringify({ transcript, reply, audio: tts?.audio, audioMime: tts?.mime }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("voice-bot error:", e?.message || e);
    return new Response(
      JSON.stringify({ error: e?.message || "Voice processing failed", details: String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
