# Aresh Codex

Aresh Codex is a worldbuilding and sourcebook site for the fantasy setting Aresh.

The site should feel like a pre-industrial atlas, field survey, and scholarly archive maintained by an in-world cartographer-naturalist rather than a generic fantasy database. It is a modern web app in structure, but its presentation should evoke parchment folios, cartographic marginalia, specimen plates, temple archives, and expedition records.

## Core goals

- Present Aresh as a living codex rather than a static document dump.
- Support both broad exploration and deep reading.
- Organize world content into strong buckets with reusable entry templates.
- Establish an in-world scholarly voice through framing, labels, and visual treatment.
- Keep the system scalable so later lore does not require redesigning the whole site like a civilization collapsing under its own bureaucracy.

## Design goals

The visual language should suggest:

- pre-industrial cartography
- Hebrew and Egyptian scholarly influence
- engraved naturalist plates
- archival folios and catalog records
- expedition notes and field observations

The site should avoid:

- glossy fantasy game launcher UI
- generic fandom wiki presentation
- neon high fantasy dashboard styling
- over-designed effects that compete with the content

## UX model

Use a hybrid structure:

- section pages for major codex buckets
- cards for browsing entries
- drawers or modals for quick inspection
- full pages for deep canon entries

### Major buckets

- Welcome to Aresh
- Pantheon
- Regions
- Cultures
- Relics and Magic
- Creatures and Powers
- Chronicles

## Tone and voice

The site is framed as if maintained by:

**Herodetus Darwin, Half-Elf of the Line of Ashen, Scribe of the Halls of Shekelarmesh**

The writing and UI labels should feel:

- scholarly
- observational
- precise
- slightly formal
- archival rather than casual

Examples:

- "Catalog of Divine Aspects"
- "Geographic Survey"
- "Recorded Entry"
- "Archive Folio"
- "Field Observations"

## Technical direction

- Next.js App Router
- Tailwind CSS
- Vercel deployment
- component-based UI
- content model first
- reusable codex primitives

## Development priorities

1. establish layout and visual system
2. build reusable codex components
3. define content schemas
4. implement section overview pages
5. implement entry cards and detail pages
6. add later enhancements like timelines, maps, and relationships

## Non-goals for phase 1

- full CMS integration
- multiplayer editing
- account systems
- complicated animations
- lore generation tools inside the UI

Phase 1 should focus on making the codex coherent, beautiful, and extensible.
