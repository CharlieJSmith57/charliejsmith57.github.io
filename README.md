# Charlie Smith — portfolio

Static portfolio for GitHub Pages. No framework, no build step: HTML, CSS and vanilla JS.

The visual language is the **Cairn & Plenum design system** (paper / stone / ink neutrals, brass primary,
one hue per trade, Space Grotesk / Work Sans / IBM Plex Mono). The tokens live at the top of
`assets/style.css`; every light token has a dark twin under `:root[data-theme="dark"]`.

## Pages

```
index.html            Home: hero, stats, selected work, principles, contact
projects.html         All work, with filter chips
cairn-plenum.html     Case study: Cairn (iOS capture) + Plenum (macOS viewer) + server + trainer
linkedin-plus.html    Case study: LinkedIn+ network pipeline and graph
zeolite-water.html    Case study: WPI GPS water-from-air research plan (embeds assets/gps-report.pdf)
stirling-engine.html  Case study: ME 1800 Stirling engine, CAM to CNC
portfolio-site.html   Case study: this site
about.html            Bio, education, experience, leadership, skills
404.html              Branded not-found page (served automatically by GitHub Pages)
project-1/2/3.html    Redirect stubs for the old URLs
assets/style.css      All styles (tokens at the top)
assets/main.js        Theme control, nav, page transitions, reveals, counters, compare wipe, network canvas
assets/images/        Headshot, Plenum screenshots, Cairn icon
assets/favicon.svg    Five-bar discipline mark
```

## Motion

- Cross-document **View Transitions** (`@view-transition { navigation: auto }`) between pages, with a JS fade fallback.
- Staggered scroll reveals via `data-reveal` + `--i`.
- **System / Light / Dark** segmented control (same control as the apps); theme is stored in `localStorage` and cross-fades.
- Cursor spotlight on cards, count-up stats, a drag-to-compare wipe (geometry vs textured splat), an animated network canvas.
- Everything respects `prefers-reduced-motion`.

## Editing

- Change a colour once in the `:root` block of `assets/style.css` (and its dark twin) and it updates everywhere.
- To add a project: copy a `*-case-study` page, add a `.card` to `index.html` and `projects.html` (set `data-kind` for the filters), and update the previous/next links at the bottom of the neighbouring pages.
- Cover images go in `assets/images/`; keep them around 1600 px wide.

## Deploy

Push to `main`. GitHub Pages serves the root of the repository.
