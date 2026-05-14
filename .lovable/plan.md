I checked the live backend and code paths. The hosted backend is healthy, but the failures are coming from brittle function flows and incomplete UI handling:

- Voice audio transcription falls back to a Hugging Face endpoint that is currently wrong, so recorded audio can return non-2xx.
- AI Advisor uses a very large forced tool schema with expensive/slow model calls; this can time out and show non-2xx instead of returning a useful fallback.
- AI Krishi Advisor chat works in direct tests, but the UI only shows generic errors and voice input has weak diagnostics/language control.
- Field Mapper delete exists, but it is hard to use and map-drawn polygons are not editable enough; location search is basic and Bhuvan is not used yet.

Plan:

1. Fix Krishi Voice end-to-end .  Please voice of ai agent should be like human you can use the chatgpt or anything else . 

- Replace the broken Hugging Face transcription URL with a reliable inference endpoint and keep Groq/Lovable AI as fallback paths.
- Add a no-crash fallback response: even if STT provider fails, the function returns structured diagnostics instead of only a 500.
- Add explicit language selection in the Krishi Voice popup: English, Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Punjabi, Kannada, Malayalam, Odia, Assamese, Urdu.
- Use selected voice language for STT, AI response language, and browser TTS.
- Show STT confidence when browser SpeechRecognition provides it; show “not available” for provider paths that do not return confidence.
- Add a voice diagnostics panel showing:
  - mic permission status
  - active STT path: browser, recorder/Groq, recorder/Hugging Face
  - audio mime type, file size, duration
  - selected language
  - last provider error
  - last function status

2. Fix AI Krishi Advisor chat and its voice input

- Reuse the same language + diagnostics logic for chat voice input where appropriate.
- Improve error display so the user sees the real cause instead of only “Edge Function returned a non-2xx status code”.
- Make the chat fallback usable if streaming fails: retry once with non-streaming response or show a grounded local advisory template.
- Keep replies practical: quantities, timing, warnings, and specific next step.

3. Make AI Advisor deep, reliable, and more scientific

- Refactor the `ai-advisor` function to produce a deterministic agronomy baseline first, then enrich with AI. This prevents total failure when AI times out.
- Add crop reference tables for common Indian crops: seed rate, water requirement, NPK, pesticide/IPM baseline, season windows, approximate duration, soil pH fit, and irrigation notes.
- Infer season automatically from sowing and harvest dates:
  - Kharif, Rabi, Zaid, or unclear/overlap
  - compare inferred season against selected crop and allocation season
- Add explicit warning output when selected crop/date/season is incompatible:
  - what mistake is happening
  - suggested alternative crop
  - what to change first: sowing date, crop, irrigation, variety, or land allocation
- Add measurement-style input to the wizard:
  - per acre / per hectare
  - metric / local-friendly units
- Output seed, water, fertilizer, and pesticide/IPM with clear units and conversions:
  - per acre
  - total for allocated acres
  - kg, litres, mm, kL, bags where sensible
- Add richer crop allocation inputs:
  - crop, acres, variety, sowing date, harvest date, season override, irrigation method, fertilizer use, pesticide use
- Update result UI with dedicated cards for:
  - season mistake warnings
  - crop-wise input calculator
  - first action to change
  - confidence/data quality

4. Repair Documentation Tools

- Make the documentation tool cards clearly clickable, not just the small Open button.
- Add generated PDF/text outputs for loan, insurance, tax, and farm-data export with farmer profile data.
- Add graceful fallback when scheme matching AI fails so the tools still open and generate documents.
- Surface errors as inline messages instead of silently showing empty results.

5. Improve Field Mapper substantially

- Add precise location search above the map:
  - village/district/address search
  - use Bhuvan village geocoding where possible through a secure backend function using the existing Bhuvan secret
  - fallback to Open-Meteo/Nominatim when Bhuvan returns nothing
- Add “use my GPS” and “jump to profile location” controls.
- Improve polygon drawing:
  - allow many vertices for irregular fields
  - show instructions while drawing
  - ensure the user can finish polygons with more than three points
- Fix deletion UX:
  - visible delete buttons on every zone, not hover-only
  - selectable zones on map
  - delete selected zone from map/sidebar
  - keep cloud/local delete in sync and show errors clearly
- Add edit support for existing polygons if feasible with the current Leaflet Draw setup.
- Add Bhuvan/ISRO layer support where technically available:
  - Bhuvan-compatible geocoding/search via backend
  - add an India-focused satellite/thematic layer option if a stable public WMS/WMTS endpoint is usable
  - keep NASA MODIS NDVI as fallback if Bhuvan tiles are not directly consumable from the browser
- Improve scientific output in Field Mapper:
  - crop-wise area totals
  - water demand by irrigation efficiency
  - NPK budget
  - estimated seed requirement
  - yield/revenue estimate
  - soil pH/season warning per zone

6. Validate before saying done

- Test `voice-bot`, `krishi-ai`, and `ai-advisor` edge functions directly after changes.
- Verify the UI no longer shows generic non-2xx for the tested flows.
- Check the Field Mapper map loads, search moves the map, draw/delete works, and analytics update.

Scope note:
This is a large repair across several frontend components and three backend functions. I can implement the full repair in phases in one build pass, but if any external provider blocks us (invalid Groq key, Hugging Face model access, or Bhuvan endpoint restrictions), I’ll ship graceful fallbacks and diagnostics so the app still works and tells you exactly what failed.