# Brand

- Product:        Blue Star Spec Writer (CSI Section 26 32 13 guide-spec generator for packaged engine-generator sets)
- Audience:       consulting/specifying engineers and Blue Star reps preparing genset submittals
- Direction:      technical / engineering-drawing — reads like a sealed drafting sheet, not a startup
- Mood words:     precise, rugged, document-grade, trustworthy
- Theme:          light "drafting paper" (the output is a printable engineering document)
- Display font:   Saira Condensed (industrial, compressed — mastheads, part/article titles)
- Body font:      IBM Plex Sans (engineered, readable — UI prose)
- Mono font:      IBM Plex Mono (all technical metadata: designators, step index, values, labels)
- Base accent:    #14346b (Blue Star navy — dominant) with #d9670f (safety amber — sharp accent)
- Avoid:          startup-purple, blue-on-white SaaS look, rounded-everything, faint drop shadows, emoji icons

## System

Tokens live in `src/styles.css` under `@theme` and are referenced as Tailwind
utilities (`text-ink`, `bg-blue`, `border-line`, `font-display`, `font-mono`, …) —
no scattered hex in components.

- **Color:** deep navy `ink` text/dominant, sharp `amber` accent, blue-gray
  neutral ramp (`line` / `line-soft` / `dim`), cool-paper `bg`, white `surface`.
- **Shape:** sharp corners (`rounded-sm`), hairline borders instead of shadows.
- **Atmosphere:** faint blueprint grid (`.bp-grid`) on the app background.
- **Signature:** the engineering **title block** — section designator "26 32 13"
  set in condensed display type with amber registration ticks, mirrored in the
  generated spec document's header.
- **Motion:** one orchestrated rise-in (`.rise-in`) per step; respects
  `prefers-reduced-motion`.
