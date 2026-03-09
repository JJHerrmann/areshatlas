# AGENT.md

This document defines how contributors, coding agents, and future automation should approach the Aresh Codex project.

## Mission

Build a codex website for Aresh that combines modern web usability with the aesthetic of a pre-industrial cartographic archive.

The experience should feel like an in-world survey manuscript maintained by a scholar-cartographer, not a generic wiki or product dashboard.

## Product principles

1. Content first.
   The site exists to make lore legible, navigable, and expandable.

2. Atmosphere through structure.
   Use layout, type, borders, labels, SVG ornaments, and restrained texture to create mood before relying on bespoke art.

3. Reusability over one-off styling.
   If a pattern appears twice, it probably deserves a component.

4. Codex before app gimmicks.
   Resist unnecessary interactivity unless it clearly improves navigation or comprehension.

5. In-world framing matters.
   Labels, headings, and metadata should reinforce the sense that this is a maintained scholarly archive.

## Required tone

All user-facing copy should trend toward:

- scholarly
- archival
- measured
- descriptive
- mythic but restrained

Avoid:

- snark in product copy
- modern marketing jargon
- game launcher hype language
- generic fantasy cliches unless intentionally used in-world

## Visual rules

Prefer:

- parchment and papyrus tones
- ink-dark typography
- brass, amber, lapis, verdigris accents
- serif display typography
- cartographic lines, coordinate rules, folio labels
- engraved or diagrammatic treatment

Avoid:

- glassmorphism
- neon gradients
- oversized rounded SaaS cards
- overly playful UI
- cluttered effects

## Architecture guidance

Use:

- Next.js App Router
- Tailwind CSS
- Vercel
- composable React components
- structured content collections

Organize the UI into:

- layout primitives
- codex primitives
- section templates
- entry templates

## Content model guidance

Expected content domains include:

- gods
- regions
- cultures
- creatures
- relics
- chronicles
- languages
- factions

Each domain should eventually support shared metadata such as:

- title
- slug
- summary
- tags
- related entries
- era
- region
- source or archive labels

## Build order

1. global layout
2. visual frame and typography
3. codex shell components
4. section overview pages
5. entry cards
6. full entry templates
7. linked content relationships
8. advanced atlas features later

## Definition of done for early work

A task is considered done when:

- it matches the codex visual language
- it uses reusable structure where appropriate
- it does not break the archival tone
- it improves navigation or readability
- it remains clean enough for future content scaling

## Notes for agents

When unsure, choose the option that makes the site feel more like:

- a field atlas
- a survey archive
- a temple record
- a natural philosopher's codex

And less like:

- a fandom wiki
- a dashboard
- a game launcher
- a random Tailwind template with fantasy paint on it
