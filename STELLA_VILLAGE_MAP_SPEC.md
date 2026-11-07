# Stella 2.0 canonical village map specification

**Status:** Proposed production specification; dimensions and layout are
provisional until prototype testing.  
**Scope:** One connected student village scene and its separable art assets.
This document does not create art, assets, source directories, routes, or
runtime behavior.

## 1. Art direction

Create a detailed, carefully clustered 16-bit pixel-art village with a
consistent isometric projection. Use a warm, welcoming Coptic-inspired
architectural language: stone and plaster walls, shaded arcades, domes,
crosses, courtyards, gardens, and modest liturgical details. Christian symbols
should be respectful, legible, and integrated into architecture rather than
used as decoration without context.

The approved palette is midnight, parchment, antique gold, burgundy, sage,
ivory, stone, forest, and sky. Use the existing Stella palette tokens as color
references, but produce an art palette with deliberate light, shadow, and
outline steps. Keep lighting direction, outline weight, pixel cluster size,
building scale, and material treatment consistent throughout the scene.

Choose **isometric** rather than three-quarter perspective because the world
needs a legible connected street network, consistent building footprints,
recognizable destination silhouettes, and reusable characters/objects that
can be layered over a fixed map. Isometric ground diamonds support a clear
walkable grid and predictable collision geometry. Use one fixed projection and
one light direction; do not mix top-down and three-quarter assets.

Avoid painterly blending, photorealism, vector-like smooth outlines,
uncontrolled antialiasing, inconsistent pixel sizes, and excessive tiny
decoration that becomes noise at phone scale. The map art itself contains no
embedded text, UI, buttons, labels, signs with letters, or navigation states.
Use non-text architectural silhouettes and restrained symbols to distinguish
destinations. Interface labels and controls belong to the accessible React
layer, not the artwork.

The ignored `dist/images/church-square-village.png` is a reference only for
warm architecture, a central church-square concept, and connected paving. Do
not copy, integrate, trace, or modify that image.

## 2. Canonical composition and destination placement

The world is one contiguous settlement, not seven disconnected screens. Church
Square is the central visual anchor and the largest open gathering/movement
area. Streets should branch from it and form at least one secondary loop so
each destination remains reachable without crossing building interiors.

Use the following provisional placement on the canonical ground grid. A
destination coordinate identifies the center of its walkable entrance apron,
not the center of its building art. Grid coordinates increase east (`u`) and
south (`v`); see the coordinate model below.

| Destination | Provisional entrance `(u, v)` | Visual identity and connections |
|---|---:|---|
| Church Square | `(32, 32)` | Central open plaza with the principal church as its north-side anchor, clear gathering area, and branches to every district. |
| Library | `(16, 24)` | Distinct arched/library silhouette with books or lectern motifs; connect to Church Square and Pilgrim's Road. |
| Pilgrim's Road | `(44, 12)` | A clearly marked path/journey landmark rather than a detached building; connect west to Church Square and south to the garden/saints loop. |
| Prayer Garden | `(48, 40)` | Quiet walled garden, trees, water, and a small prayer shelter; connect to Church Square and the south/east loop. |
| Hall of Saints | `(16, 52)` | Recognizable hall with restrained saint icon panels or halo motifs; connect to Church Square and the west/south loop. |
| Gathering Hall | `(32, 48)` | Community hall with shaded courtyard seating; connect directly to Church Square by a broad southern avenue. |
| Treasure Room | `(8, 16)` | Small, secure treasury/achievement building, visually distinct without suggesting purchasable power; connect to the library/western route and Church Square. |

These are layout anchors, not finalized tile placements. The art pass may
adjust footprints and entrances to preserve the isometric perspective, but it
must preserve the central square, destination order/recognizability, and a
continuous public path graph. No destination may be reachable only by walking
through another building or a seasonal prop.

The church and square should read first at a glance. Place the other buildings
around the square with enough separation to read as distinct silhouettes.
Reserve a central open area for the student's character and small groups of
characters; avoid placing permanent props, UI targets, or tall foreground
objects across this movement/gathering zone.

## 3. Coordinate and camera model

### Canonical world space (provisional)

- Use a **64 × 64 cell** canonical ground grid, with 32 × 16 logical pixels
  per isometric ground cell. The square coordinate grid provides room in both
  projected axes for north/south and east/west routes; isometric projection
  produces a broad landscape diamond suitable for the desktop world.
- For a cell center `(u, v)`, project to logical pixel coordinates using:
  - `x = originX + 16 * (u - v)`
  - `y = originY + 8 * (u + v)`
- Each cell projects to a 32 × 16 diamond. Treat grid coordinates as
  canonical gameplay/map coordinates; do not store interactions only as
  screen pixels.
- The ground projection spans approximately 2,048 × 1,024 logical pixels before
  building heights, canopies, and safe margins. Start with a **2,304 × 1,792**
  transparent/layered export canvas. A centered horizontal origin of about
  1,152 pixels and a vertical ground origin near 384 pixels leave room for
  tall northern buildings and the southern ground edge. These pixel dimensions
  and origins are provisional; validate art bounds and mobile delivery budgets
  before final export.
- Keep footprints, doorway anchors, walkability, and scene bounds in the same
  canonical grid regardless of viewport or season. Store projected art bounds
  separately from ground footprints so tall structures do not alter collision.

The tile size is a design grid, not a requirement that every visible feature
be exactly one tile wide. Buildings and paved areas span multiple cells.
Characters may move smoothly between cell centers but should be constrained by
the walkability representation.

### Camera

Use a single fixed isometric world orientation with a camera that pans and
zooms within safe bounds. Keep Church Square and the student's current
position near the viewport's visual center. Destinations can be reached by
following paths or via accessible React navigation; never require discovering
a tiny art hotspot to reach a feature.

Start at a scale where a character remains recognizable and a 3-cell path
remains visibly navigable. Fit/crop the world rather than stretching it.
Preserve important buildings and destinations inside a camera-safe area; allow
nonessential tree lines and decorative outskirts to crop. Provide a clear
recenter/home action in the future UI, outside the artwork.

## 4. Sprite and layer breakdown

Keep the canonical map as separable, reusable layers rather than one flattened
image:

1. **Ground base:** terrain, shoreline/outer boundary if used, and broad
   non-walkable natural areas.
2. **Ground details:** paving, paths, grass transitions, garden beds, and
   small fixed floor details. Avoid baked-in interaction cues.
3. **Walkability/collision data:** a separate machine-readable grid or mask
   defining walkable cells, obstacle cells, entrances, and map bounds. It is
   never inferred from decorative pixels at runtime.
4. **Low props:** fences, benches, planters, wells, and short objects that can
   sit behind or in front of a character according to their foot position.
5. **Buildings:** individual transparent sprites with separate ground
   footprint/entrance anchors. If a building must occlude a character, split
   it into back/roof and foreground/overhang pieces around the character layer.
6. **Characters:** independent transparent sprites with a consistent foot
   anchor, scale, facing directions, and animation frame dimensions.
7. **High canopy/foreground:** tree crowns, arch tops, or other foreground
   pieces that must render in front of a character.
8. **Seasonal overlays:** optional restrained effects (for example leaf color,
   flowers, or snow accents) that do not alter paths, entrances, collision, or
   destination silhouettes.
9. **Navigation overlay:** React-rendered accessible controls, labels, focus
   states, and selected/locked state. It is not part of the art export.

Use a consistent depth rule, such as sorting characters and movable props by
their projected ground `y`/foot anchor, with explicit foreground layers for
art that cannot be handled by sorting. Keep decorative overlays pointer
inert. Interactive destinations should have large HTML targets with keyboard
focus and accessible names positioned from canonical anchors.

## 5. Walkability and collision requirements

- Maintain an explicit walkability map aligned to the 64 × 64 canonical grid.
  At minimum distinguish walkable ground, blocked ground, doorway/transition
  cells, and out-of-bounds cells.
- Every destination entrance apron must connect to the public path network.
  Run a connected-component check so all seven destinations are reachable
  from Church Square.
- Provide at least **3 cells (96 logical projected pixels)** of clear width on
  primary paths, with **4 cells** preferred near Church Square, junctions, and
  gathering areas. This is a proposed starting point: test with the character
  footprint and touch/viewport scale; widen paths if movement looks cramped.
- Reserve a central movement/gathering area at Church Square of approximately
  **12 × 10 grid cells**, initially free of buildings and fixed collision.
  Allow nonblocking surface decoration only where it does not impede
  characters or cover destination controls.
- Collision footprints should include walls, building bases, trunks, fences,
  water, cliffs, and permanent furniture. Use visible art bounds only for
  rendering; use authored ground footprints for collision.
- Give each sprite a documented ground/foot anchor. Trees and tall buildings
  may visually overlap walkable ground; their collision shape must remain
  explicit and conservative.
- Routes must remain unblocked by characters, seasonal effects, and foreground
  art. Test path continuity around all junctions and entrances.

## 6. Responsive viewport strategy

The same canonical coordinates are used at every viewport. Adapt by camera
scale and framing, not by rearranging destinations or stretching artwork.
Values below are proposed starting assumptions to validate with prototypes.

| Viewport class | Initial camera strategy | Required visibility/behavior |
|---|---|---|
| Portrait phone, about 360–430 CSS px wide | Tight camera around Church Square/current character; modest zoom; pan along connected routes. | Keep character and nearest path junction visible. Reach all destinations by panning or accessible destination navigation; do not shrink the entire world until buildings are unreadable. |
| Landscape phone, about 640–900 × 360–430 CSS px | Wider camera with the square and one or more adjacent branches in view. | Preserve character scale and path width; allow horizontal exploration without vertical clipping of key roofs/entrances. |
| Tablet, about 768–1,200 CSS px wide | Intermediate zoom centered on square, showing several surrounding destinations. | Keep navigation controls reachable outside the art and avoid excessive unused margins. |
| Desktop, about 1,200+ CSS px wide | Wider camera showing most or all of the village when it remains legible; allow pan if a fit would reduce character/path readability. | No forced full-world fit at the expense of tiny art; retain a clear central focus and keyboard-operable destination navigation. |

Test at representative narrow, standard, and large devices, including browser
zoom and safe-area insets. The camera must avoid horizontal page overflow,
preserve destination hit targets, and keep interactive controls outside
decorative crop regions. If the full world cannot remain readable on a phone,
use a cropped/pannable scene with an accessible destination list rather than
creating a separate inconsistent map.

## 7. Seasonal asset strategy

Seasonal variation is an overlay/variant system over the canonical base map.
Keep all building ground footprints, destination anchors, paths, collision
cells, and world coordinates unchanged. Seasonal sets may replace foliage
colors, flowers, banners without text, sky/ambient details, and small
nonblocking props. Snow or fallen leaves must not cover path edges or entrances.

Name variants with the existing convention from
`STELLA_VILLAGE_ASSETS.md`; share base assets and load only the active season.
Seasonal art must be optional, removable, and safe to fall back to the base
map. Do not duplicate the entire map for every season or preload all seasons.
Do not use flashing effects, rapid particle systems, or motion that interferes
with reading, navigation, or reduced-motion preferences.

## 8. Performance and accessibility requirements

- Optimize each layer and sprite independently. Prefer lossless PNG for
  transparent pixel art; evaluate lossless WebP for opaque background layers
  only after confirming crisp edges and reliable browser support. Do not
  introduce lossy artifacts around pixel clusters.
- Keep exports at authored/native pixel resolution. Use integer scaling and
  nearest-neighbor rendering only for pixel-art layers that are scaled; never
  apply pixelated rendering globally to text or UI.
- Initial working budgets: keep the visible base-map layer set within **1 MiB
  compressed** on mobile, individual large layers ideally below **500 KiB**,
  and character/object sheets ideally below **200 KiB**. These are targets,
  not excuses to reduce visual quality; measure actual transfer size and
  decoded memory on low-end devices and split oversized layers.
- Avoid loading every character animation, building variant, or seasonal
  layer. Load only the current scene and required animation frames. Use
  explicit dimensions/aspect ratios, asynchronous decoding, and lazy loading
  for noninitial destinations/layers where appropriate. Avoid decoding a
  multi-megapixel full-resolution atlas on constrained phones if smaller
  region sheets suffice.
- Avoid large GIFs, video backgrounds, unnecessary animation libraries, and
  full-screen continuous animation. Prefer a small number of sprite frames;
  pause or reduce nonessential animation when not visible and honor
  `prefers-reduced-motion`.
- Make the scene nonessential to understanding or using Student features.
  Provide accessible React navigation for all destinations, visible keyboard
  focus, meaningful destination names, and a non-map route to each feature.
  Decorative art should have empty alternative text; if the full scene conveys
  information, provide a concise text alternative or accessible destination
  list rather than describing every decorative pixel.
- Ensure contrast and destination states are not conveyed by color alone.
  Support RTL without mirroring Coptic architectural symbols or changing map
  coordinates; mirror controls/layout as needed while preserving the map's
  orientation.
- Do not precache the entire village or all seasonal assets. Select any
  essential offline assets deliberately and verify Workbox output and storage
  impact before changing PWA behavior.

## 9. Production image-generation brief for the later art task

Create an original, source-controlled, detailed 16-bit pixel-art isometric
village scene for Stella 2.0. Use a consistent 2:1 ground-diamond projection,
one upper-left light direction, crisp clustered pixels, consistent outline
weight, and a restrained palette based on midnight, parchment, antique gold,
burgundy, sage, ivory, stone, forest, and sky.

Compose one large connected settlement on the proposed 64 × 64 ground grid.
Place a welcoming Coptic church and generous open Church Square at the center.
Connect seven distinct destination areas by broad, continuous, navigable paved
paths: Library to the northwest; Pilgrim's Road to the northeast; Prayer
Garden to the southeast; Hall of Saints to the southwest; Gathering Hall to
the south; and Treasure Room on the northwestern route. These placements are
provisional; prioritize continuous routes, distinct silhouettes, and clear
entrances. Leave a central character gathering area in the square and enough
unobstructed path for a small character to move.

Keep architecture, walls, doorways, roofs, low props, foreground canopies, and
terrain on separable transparent layers with documented anchors. Do not draw
characters into the map background; do not add words, lettering, UI, labels,
buttons, or signs with text. Do not copy, trace, or use the ignored
`dist/images/church-square-village.png` as source pixels. The reference may
inform only the general warmth, church-square concept, and connected paving.

Deliver an editable layered source plus optimized exports sized to the tested
logical resolution. Provide a separate walkability/collision grid and
destination-anchor data; do not infer them from image pixels. Include
portrait-safe and desktop framing guides without moving canonical buildings
or changing the map's projection. Validate actual crops and pixel sharpness at
native size and integer-scaled phone/tablet/desktop previews before approval.

## 10. Open decisions and validation checklist

### Decisions to resolve before final art

- Confirm whether the initial 64 × 64 cell grid and 32 × 16 logical cell
  projection leave enough space for all seven destination footprints and
  perimeter context.
- Confirm final export dimensions, pixel scale, and acceptable decoded memory
  from representative mobile prototypes.
- Decide whether the scene is assembled from image layers, tileable ground,
  or a hybrid; keep collision and destination data independent either way.
- Decide the character sprite's exact logical height, animation directions,
  frame count, and whether character customization is in the first art set.
- Confirm the final appearance and theological review of Coptic architectural
  and iconographic motifs.
- Confirm whether the map should initially show the whole world on any
  viewport or consistently use a pannable close camera.
- Set final mobile transfer budgets and decide which, if any, assets are
  essential for offline use.
- Record the source, creator, license, and allowed derivative/use terms for
  every commissioned or generated production asset.

### Validation checklist

- [ ] Church Square is the immediate visual anchor and has usable open space.
- [ ] All seven destinations are visually distinguishable without embedded
  words or UI.
- [ ] Every entrance connects to Church Square through the authored walkability
  graph; automated connectivity validation passes.
- [ ] Primary paths meet the proposed 3-cell minimum and remain readable at
  phone scale.
- [ ] Character scale and foot anchors work beside doors, paths, props, and
  other characters; occlusion order is consistent.
- [ ] Buildings, paths, collision, and destination anchors align in the
  canonical coordinate system.
- [ ] Portrait phone, landscape phone, tablet, and desktop framing are tested
  without stretching, page overflow, or unreadable shrink-to-fit.
- [ ] Pixel edges remain crisp at all approved scales; no mixed perspective,
  blurred outlines, or accidental smoothing is visible.
- [ ] Seasonal substitutions preserve exact base footprints, paths,
  entrances, and collision; effects never obstruct navigation.
- [ ] Mobile transfer size and decoded memory meet measured budgets on a
  low-end device; unused seasons/animations are not loaded.
- [ ] Keyboard and assistive-technology users can reach every destination
  without interacting with decorative image pixels; RTL does not distort art.
- [ ] Asset provenance/license and final dimensions are recorded before
  integration.
