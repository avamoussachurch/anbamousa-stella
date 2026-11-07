# Stella village art asset convention

This document defines a proposed home for future village artwork. It does not
add asset directories, artwork, loaders, or runtime behavior.

## Current repository findings

- `public/` currently contains PWA icons and `icon.svg`; no village artwork was
  found there. `src/assets/` does not currently exist.
- The repository has an existing public upload sample under `uploads/`, inline
  SVG avatar data, and remotely loaded user media. These are separate from the
  proposed village art and should not be moved or adopted as village assets.
- Image loading uses native `<img>` elements, including `loading="lazy"` for
  feed photos. No shared image-loading helper or image optimization plugin was
  found.
- Vite's existing config uses its standard asset handling and the PWA plugin.
  Workbox currently precaches matching build files up to 5 MiB and its glob
  patterns include PNG and SVG but not WebP. In particular, do not assume that
  all village art should be precached or available offline; review cache
  inclusion deliberately when adding real assets.

## Proposed directory structure

Keep imported, content-hashed art under `src/assets/village/`; reserve
`public/` for files that need a stable URL and have an explicit caching reason.

```text
src/assets/village/
  environments/       # village maps, regions, ground and background layers
  buildings/          # buildings, landmarks and environmental objects
  characters/         # character sprites and sprite sheets
  seasons/            # seasonal overlays and alternate art
  ui/                 # small decorative pixel labels, frames and icons
```

Treat these as logical categories, not a requirement to create empty
directories. Keep an asset referenced by one feature near that feature's
manifest/module if that makes ownership clearer, while retaining the naming
rules below.

## Naming

Use lowercase ASCII kebab-case, stable semantic IDs, and explicit variants.
Use `base` for the default artwork and omit optional dimensions from a name
when they are already defined by the asset manifest.

```text
<category>-<id>__<variant>[__<season>][__<state>].<extension>
```

Examples:

```text
map-village-core__base.webp
building-chapel__base.png
building-chapel__snow__winter.png
object-lantern__lit.png
character-mary__idle__south.png
character-mary__walk__south.png
character-mary__walk__south__sheet.png
decoration-star__gold.png
```

Keep a character's frame dimensions and animation ordering consistent across
its sheets. Use a season suffix only for a real seasonal variant; shared art
should be referenced rather than copied into every season. Avoid names based on
screen coordinates, temporary concepts, or implementation order.

## Format and authoring guidance

- Use **lossless PNG** for transparent sprites, crisp pixel clusters, and small
  UI decorations. Indexed-color PNG is suitable when the palette allows it.
- Use **WebP** for opaque map/background layers and photographic-like
  environmental textures. Lossy WebP is acceptable only after visual review at
  native size; use lossless WebP when preserving exact pixel edges or alpha.
  Use PNG instead if the production toolchain cannot reliably preserve the
  needed alpha or crisp edges.
- Do not use large GIFs or video backgrounds. Prefer a small sprite sheet for
  frame-based pixel animation; keep frames in a uniform grid and document
  frame width, height, order, and animation timing in the owning manifest or
  component.
- Author sprites at a declared logical/native resolution. Prefer reusable
  tiles and layers over one oversized image. Backgrounds should be sized for
  their actual display region and responsive crop; add a separate variant only
  when a crop cannot preserve important art.
- Preserve transparency around sprites and objects. Remove unused transparent
  padding where it does not define intentional alignment. Do not upscale source
  art with smoothing. When scaling pixel art, use integer scale factors and
  `image-rendering: pixelated` on the specific rendered image or canvas; do not
  apply it globally.
- Optimize exports before check-in. Strip unnecessary metadata, retain alpha
  where required, and visually inspect compressed outputs at 100% and at their
  rendered size. Keep files small enough for mobile; as initial review budgets,
  target under 500 KiB per background layer and under 200 KiB per sprite sheet,
  then split or optimize larger assets rather than loading them indiscriminately.

## Loading and memory expectations

- Use native `<img loading="lazy" decoding="async">` for below-the-fold images
  where supported. Do not lazy-load a small above-the-fold image that is needed
  for the initial view.
- Give images explicit dimensions or an aspect ratio to reserve layout space.
  Provide meaningful `alt` text for informative art and empty alt text for
  decoration. Keep a neutral, fixed-size surface as the loading/failed-image
  placeholder; do not substitute unrelated or fake artwork.
- Load only the visible/current region and the character frames needed for the
  current view. Do not preload every map layer, building, animation, or seasonal
  variant. Release unneeded decoded images when leaving a scene where practical.
- Prefer feature/region-scoped asset references that can be loaded on demand;
  avoid a single eager manifest that imports the entire village. Native lazy
  image loading defers fetching but does not by itself guarantee that the
  service worker will exclude an asset from precaching.
- Before enabling offline caching, explicitly choose the small set of essential
  assets and an appropriate runtime caching strategy. The current broad PNG
  Workbox glob can precache matching PNG art, while WebP is not currently in
  that glob. If that policy changes, update and verify the PWA cache patterns
  intentionally rather than caching all seasonal and map assets by default.
