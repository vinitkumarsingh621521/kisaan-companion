import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('TWENTYFIRST_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'TWENTYFIRST_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { prompt, message, searchQuery } = await req.json();
    const userPrompt = prompt || message;
    if (!userPrompt || typeof userPrompt !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing "prompt" string' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://api.21st.dev/magic/v1/create-ui', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userPrompt,
        searchQuery: searchQuery || userPrompt.slice(0, 80),
      }),
    });

    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { ...corsHeaders, 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
