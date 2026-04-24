import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM = `You are KrishiMitra Voice — a warm, witty agricultural advisor for Indian farmers. The user spoke to you. Reply in the EXACT same language they used. Keep replies short (2-4 sentences) since they will be SPOKEN aloud. Be specific, practical, and friendly. Reference the farmer's profile data when given.`;

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

    return new Response(JSON.stringify({ transcript, reply }), {
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
