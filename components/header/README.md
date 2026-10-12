# Kedantlan header map

A wide banner over a 4-level tile pyramid of Kedantlan and the surrounding lands. Everything outside the surveyed area is fog of war. No months, no layers: the satellite look only.

## Install (Next.js, app router)
1. Copy `public/kedantlan-header/` into the repo's `public/`. It holds 29 webp tiles (about 2.2 MB, loaded lazily by zoom level) and `region.json` (the Kedantlan outline, 49 KB).
2. Copy `src/kedantlan-header.js`, `src/kedantlan-header.d.ts` and `src/KedantlanHeader.tsx` into a components folder, keeping them together.
3. Use it as the header:
   ```tsx
   import KedantlanHeader from '@/components/KedantlanHeader';
   <KedantlanHeader />
   ```
   Props: `base` (default `/kedantlan-header/`), `atlasHref` and `atlasLabel` (adds a link button, for example to a public atlas page), `outline` (default true), `className`.

## Behavior
- Default view is a 3.2:1 band across the full survey width, with a little fog visible at both ends.
- The header never traps page scroll. Dragging and wheel zoom turn on only after "Explore the map" is pressed; Esc or "Done" turns them off.
- Keyboard when exploring: arrows pan, + and - zoom, 0 resets. Pinch works on touch.
- Pan is clamped to the survey plus a margin of fog.
- Styles are injected by the script, so no CSS changes are needed. The hint text hides under 560 px wide.

## Notes
- Only the Naharapan marker is drawn. More sites go in the `SITES` array at the top of `kedantlan-header.js` (lat, lon).
- The survey covers lon -10 to 27 and lat 20 to 52 (120 px per degree).
- `demo.html` is a standalone test page. Serve this folder with any static server and open it.
- This is a client component. If the header must be part of server-rendered HTML for SEO, keep a plain `<img>` poster inside the wrapper as a fallback.

---

## Install notes for this repo (added 2026-10-11)

Files are already in place:

- `public/kedantlan-header/` — 29 webp tiles + `region.json` (2.2 MB). Tracked by git:
  `.gitignore` ignores `*.png` globally but has no `*.webp` rule, so these are fine.
- `components/header/` — `kedantlan-header.js`, `.d.ts`, `KedantlanHeader.tsx`.

**The page wiring is NOT applied.** The checkout is on `thaer-registry`, whose home page is
Thaer copy ("Post-Exile", "Vienna's exile"); a Kedantlan header does not belong there. Apply
`wire-into-home-page.patch` on an Areshnaat branch instead:

```bash
git apply components/header/wire-into-home-page.patch
```

It adds the import, a `<figure class="wiki-header-map">` above the article in `app/page.tsx`
(with a `<noscript>` poster using the L3 tile), and placement styles in `app/globals.css`.
Verified on `seo-p0`: build green, tiles and `region.json` serve 200, map renders.

### Why it is not the site-wide header

`app/layout.tsx` has no banner; the existing one is a sidebar box in
`components/codex/WikiSidebar.tsx` using `/branding/hero-banner.svg`. That sidebar `<img>` is
left in place deliberately — this component is client-only (`useEffect` mount, so SSR ships an
empty `<div>`), and the sidebar image keeps a real `<img>` with alt text in server-rendered
HTML. Moving the map into `layout.tsx` would put 2.2 MB of tiles on every route; it currently
loads on the front page only.
