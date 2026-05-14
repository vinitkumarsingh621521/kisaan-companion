The browser tab currently shows a heart icon next to "Home · KrishiMitra". This comes from the site's favicon (default Lovable heart). Replace it with a KrishiMitra-appropriate farming icon.

## Steps

1. Generate a favicon image using imagegen (premium, transparent background): a clean, flat green plant/sapling/leaf icon — simple, bold, recognizable at 32×32. Save to `public/favicon.png`.
2. Delete the existing `public/favicon.ico` so browsers don't fall back to it.
3. Update `index.html` to add `<link rel="icon" href="/favicon.png" type="image/png">` and point `apple-touch-icon` at the new file as well.

## Icon direction options

- **Sapling** — two small leaves emerging from soil. Friendly, growth-themed.
- **Wheat sprig** — golden/green wheat stalk. Classic agriculture.
- **Single leaf** — minimal green leaf. Cleanest at tiny sizes.

Default to the sapling unless you prefer one of the others.