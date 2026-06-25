# Edge Function API

Base URL: `${VITE_SUPABASE_URL}/functions/v1/<name>`

All endpoints accept `OPTIONS` for CORS preflight. Unless noted, send
`Authorization: Bearer <user-jwt>` and `Content-Type: application/json`.

| Function          | Verify JWT | Auth required | Purpose                                                |
| ----------------- | ---------- | ------------- | ------------------------------------------------------ |
| `krishi-ai`       | yes        | yes           | Streaming chat + structured advisory                   |
| `voice-bot`       | no         | optional      | STT → chat → TTS round-trip                            |
| `daily-tip`       | no         | yes (manual)  | One-sentence farming tip in the user's language        |
| `farmer-context`  | no         | yes (manual)  | Builds farmer-context object for personalization       |
| `pin-lookup`      | no         | no            | India PIN → district/state lookup                      |
| `dowry-estimate`  | no         | yes (manual)  | Lifestyle cost estimator                               |
| `ai-advisor`      | no         | yes (manual)  | Structured agronomic insights                          |
| `bhuvan-geocode`  | no         | no            | Forward/reverse geocoding via ISRO Bhuvan              |
| `agri-news`       | yes        | yes           | Aggregated agriculture news feed                       |
| `mandi-prices`    | yes        | yes           | Wholesale mandi prices (data.gov.in)                   |
| `market-compare`  | yes        | yes           | Compare prices across mandis                           |
| `magic-component` | yes        | yes           | 21st.dev `create-ui` proxy                             |

---

## `POST /krishi-ai`

Streaming chat (Server-Sent Events, `data: <json>\n\n` lines, `[DONE]` terminator).

```jsonc
// Request
{
  "action": "chat",            // or "advisor", "saarthi_guide"
  "messages": [{ "role": "user", "content": "..." }],
  "profileContext": { /* personalization ctx */ },
  "profile": { "full_name": "...", "farm_location": "..." }
}
```

Response: `text/event-stream`. Each chunk is OpenAI-compatible
`{ choices: [{ delta: { content: "..." } }] }`.

---

## `POST /voice-bot`

```jsonc
// Request — either audio OR text
{
  "audio": "<base64>",          // optional
  "mime":  "audio/webm",        // when audio is present
  "text":  "namaste",           // optional, used when audio omitted
  "language": "hi",
  "profile": { /* farmer_profile */ },
  "transcribeOnly": false       // when true, returns only the transcript
}
// Response
{ "transcript": "...", "reply": "...", "audio_reply": "<b64>", "audio_mime": "audio/mpeg",
  "diagnostics": { "sttProvider": "...", "chatProvider": "..." } }
```

---

## `POST /daily-tip`

```jsonc
// Request
{ "language": "hi", "profile": { "full_name": "...", "farm_location": "..." } }
// Response
{ "tip": "Rotate crops every 2 seasons to keep soil nitrogen healthy." }
```

---

## `POST /pin-lookup`

```jsonc
{ "pin": "560001" }            // → { "state": "Karnataka", "district": "Bengaluru", ... }
```

---

## `POST /bhuvan-geocode`

```jsonc
{ "query": "Pune" }            // → { "lat": 18.52, "lng": 73.85, ... }
// or reverse:
{ "lat": 18.52, "lng": 73.85 } // → { "address": "..." }
```

---

## `POST /mandi-prices`

```jsonc
{ "commodity": "Onion", "state": "Maharashtra", "limit": 50 }
// → { "records": [ { "mandi": "...", "min_price": 1200, "max_price": 1800, "date": "..." } ] }
```

---

## `POST /market-compare`

```jsonc
{ "commodity": "Wheat", "mandis": ["Pune", "Nashik"] }
// → { "compare": [ { "mandi": "Pune", "modal": 2200 }, ... ] }
```

---

## `POST /ai-advisor`

Schema is enforced — see `src/lib/aiAdvisorSchema.ts`.

```jsonc
// Request
{ "profile": { /* farmer_profile + farmer_details */ }, "season": "kharif" }
// Response (validated against zod schema)
{ "insights": [ { "id": "...", "title": "...", "body": "...", "priority": "high" } ] }
```

---

## `POST /agri-news`

```jsonc
{ "state": "Maharashtra", "lang": "en", "limit": 20 }
// → { "articles": [ { "title": "...", "url": "...", "source": "...", "published_at": "..." } ] }
```

---

## `POST /dowry-estimate`

Lifestyle cost-of-living estimator (educational tool).

```jsonc
{ "city": "Lucknow", "lifestyle": "modest" }
// → { "estimate": 750000, "breakdown": { ... } }
```

---

## `POST /farmer-context`

Returns the personalization context object used to seed the AI chat.

```jsonc
{ "profile": { /* farmer_profiles row + farmer_details */ } }
// → { "ctx": { "region": "...", "soil": "...", "crops": [...] } }
```

---

## `POST /magic-component`

Proxy for 21st.dev `create-ui`. Requires `TWENTYFIRST_API_KEY` secret.

```jsonc
{ "prompt": "a glassmorphism stat card", "searchQuery": "stat card" }
// → 21st.dev raw JSON pass-through
```
