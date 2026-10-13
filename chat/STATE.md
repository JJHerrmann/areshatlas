# Areshnaat state digest

A digest, not a source of truth. When this disagrees with the vault, the vault wins. When it disagrees with Rook, Rook wins. Last updated 2026-10-13 by the Claude chat session. Keep it short and replace lines instead of appending history. No DM material belongs here: this repo is public.

Tags: **canon** Rook decided. **proposed** awaiting a yes. **open** undecided. **modelled** simulation output, not lore.

## World frame

- **canon** Areshnaat is real Earth with the land rotated 90 degrees, the Americas in the northern hemisphere, sea level 62 m below modern. The map seam falls between Australia and Antarctica. Antarctica matches only as ice-free bedrock, the broken archipelago in the render.
- **canon** The campaign is D&D (5e and 5.5e, GURPS stat support planned). No active game and no players pointed at the setting yet, so the site is in preparation.
- **canon** Starting region: Kedantlan (computed region 23), the elves' ancestral home in Rook's frame, with Naharapan, a lake port on a river-wrapped island, as the start city. An ancient temple is thought to sit on the island.
- **modelled** Climate layers (wind belts, gyres, rain, ice, rivers) are model output. The map artifact says which fields are 1 degree.

## Peoples and origin

- **canon** Elves are the eldest people, made when an abductor took a camp of Australopithecus, advanced them a few million years under Sylvan magic exposure, and put them back, possibly elsewhere. Each people has a proto-race, an experiment and an exposure vector.
- **canon** Dwarves came from the same abductor and stock, stone-themed. They were never put back, and their experiment (a sealed dormant volcano) was still running when the abductor was caught. After a population crisis an Arch Fae emissary moved the primary clans to high-yield ranges and helped them build links between Kords.
- **canon** A Kord is a clan ("its own beard") with about 50 related sub-families. Five Kords hold the Mountainholms: Gold, Platinum (Pahir), Copper, Slate, Onyx. Dwarven subraces are castes of one species: hill dwarves (septs on the mountain's outside), mountain dwarves (the proper halls inside), duergar (deeper and more insular).
- **canon** Kord names: first closed syllable of the root, plus `dza`, plus `koda`, stress on syllables 1 and 3. Examples: Sahdzakoda (Gold, from zahav), Pahdzakoda (Platinum), Šohdzakoda (Onyx). The hall ending is `koda`.
- **canon** No Kord halls in Kedantlan, though related hill dwarf settlements are possible. Wanderers of the blood are Naddzarah.
- **canon** The Rainbow-beard is a multinational sect and an order across Kodas. Its details and a DM-only block are in the codex artifact and the vault note, not here.
- **canon** Duergar rule: heat and fire resistance plus cold-spell affinity. They cool tunnels out of the lava they live beside, so the walkable Underdark is duergar-made. Their king, the Underking, is a level 18 warlock to an ice devil patron, holding a refugee kingdom against the mind flayers and the dominated duergar.

## Languages

- **canon** One base language for all peoples (Netzhar, the Fae language, essentially Hebrew). Each people layers a different native substrate: elves Nahuatl-style and other Mesoamerican suffixes, dwarves Balto-Finnic, gnomes Hungarian, halflings Japanese.
- **canon** Karakeel (Dwarven): Hebrew triconsonantal roots, Estonian-style suffixes, vowel-carried tense. Deep vowels (a o u) and forward vowels (e i). All forward is present, all deep is infinitive or timeless, deep-to-forward is past, forward-to-deep is future. Tense lives on nouns and pronouns only. Verbs are always infinitive. Cognate-flavored, not Hebrew.
- **canon** Xibanal (Elvish): Hebrew roots, Nahuatl-shaped suffixes marking word class, vowel-slot gender (masculine long a, feminine short i, neutral long o), a `w` filler for two-letter roots. 272-entry dictionary and the renamed pantheon are in the project docs.
- **canon** Empire pair: the elven Xilbian Empire (Xibanal) and the orc empire Apasumi (Kancha). Both survive in reduced form with a few dozen client states.
- **open** Whether to keep the Baltic donor layer for dwarves (Latvian and Lithuanian) or narrow the canon line to Finnic. Lean: Finnic plus a Baltic residue, since `dza` is the fossil.
- **open** Whether the Greek and Latin prestige layer in Karakeel is canon as borrowed from the elves, or deleted. Lean: borrowed.
- **open** Whether the Karakeel examples (Zahavkoda and similar) are subordinated to the Kord recipe for Kord seats. Lean: yes.
- Empty in the vault: `_Netzhar (Proto-Language)`, `_Ajnetik (Wood Elves)`, `_Ahvesil (Sea Elves)`. Netzhar is the root of the three-layer canon.

## Scripts

- **canon** The elf hand is the root of all scripts: vertical, a spine with ticks and loops, columns left to right, vowels as full letters.
- **canon** Dwarves: right to left, joined baseline, Farsi-leaning. Tense in the stroke: present is the baseline, past thicker, future cant about 5 degrees, timeless a curled cap, verbs always capped. Refugee helper marks for vowel and tense. The chosen script is draft 3, 20 letters, including `dz` (joined d stem and z tail) and `sh` (dotted s).
- **canon** Goblinoids use a futhark-like script. Halflings and gnomes share a Thaana-like script. Humans use a Latinized Thaana with fewer accents.
- **proposed** The dwarf hand is the elf column turned 90 degrees clockwise. Elf ticks: left of the spine for deep vowels, right for forward vowels, so the rotation lands each vowel on the refugee side, above or below.
- **proposed** Goblinoid runes break the spine into staves. The small folk break it into hooks and keep ticks as marks. Humans promote the marks back into letters and write left to right.
- **open** v and w share one letter. Split with a dotted w only if Vask and Wask must differ.
- **open** Whether anyone in-world knows the dwarf hand descends from the elf script, the duergar script, refugee marks as new symbols or Kord-mark extensions, and the direction of small-folk and goblinoid writing.

## Pantheon (headlines; full detail in the project lore log and vault)

- **canon** Pantheon with five divine courts. First generation: Tahiwaco (Chaos) and Moxilaxaya (Order), consorts. Yatbara (Creation) is married to Yekala, who is also his mother. Niwara (Sun and Fire) is married to Gozara (Mensor of Dawns, the plumb-bearer). Alpha and Omega tier: Rexaya (begins) and Temaya (ends). Divine birth is not limited by gender.
- **canon** Orystria is a late addition to the pantheon, possibly contact contamination, at the Alpha and Omega level, with five daughters (the Mothers) on the first-generation level. Integration questions are open.
- **open** The pantheon audit: all 36 deity notes, ten contradictions between vault frontmatter and the family tree canvas, and eight rulings for Rook. It is in the handoff log on `main`. The work is to build a walkthrough artifact, show both readings, and let Rook choose.

## Site and pipeline

- Site: areshatlas.com, Next.js on Vercel, fed from the vault by the CLI sync. Work lands on `areshnaat-publishing` and then `main`.
- The Kedantlan header (tile pyramid, 4 levels, fog of war, explore toggle, Naharapan marker) is live on the front page. Its fixed frame: top-left at 10 W and 52 N, 120 px per degree, 4440 by 3840.
- Live: "One Root, Five Hands" at /languages/one-root-five-hands. Image embeds, callouts, single titles, empty-note handling and the language frontmatter fix are done.
- **open** Frame check for the header: confirm the tilt is unchanged since the header tiles were rendered.
- **open** `regions/Kedantlan.md` is drafted and unreviewed. It reads Kedantlan as an elf-named homeland (proposed) and carries an unresolved 10 percent versus 18 percent old-seafloor contradiction.
- **open** Gozara's truncated `symbolism_notes` and 14 god notes without a `pantheon` field are Rook's to fill.
- **open** Repo hygiene: backup files and a large tracked output folder.
- **open** The climate-layers artifact shows "Couldn't save the file" in the claude.ai viewer. The page has no save code. Undiagnosed. Fallback: move the embedded images out of the 4.8 MB HTML.

## Artifacts (claude.ai)

- World atlas and climate layers: `claude.ai/artifact/TCznbin3HStE4QF9pYQGH1`
- Kedantlan close-ups: `claude.ai/artifact/Ax6PXGqEeuow5jvoPAX1u8`
- Australopithecus camp: `claude.ai/artifact/KpDAy6V4ibdsWrJ3Qo23t2`
- Species registry: `claude.ai/artifact/XtK52FP6PL8fZi8MpQeHRr`
- Dwarves and Duergar codex: `claude.ai/artifact/XK3rCrrVGM16hLNfavXdyp`
- Site design canvas (private): `claude.ai/artifact/WanmoerYN8jwTJ9u8q4nZM`
- Pantheon walkthroughs and the Xibanal and Canon Ledger artifacts live in the artifact instructions chat; find them from the Artifacts list.

## Chats in the Areshnaat project (as of 2026-10-13)

- Dwarves, scripts, header map and CLI handoff (this digest's author): lore, drawings, the codex.
- Claude conversation artifact instructions: pantheon, Xibanal, domains, dictionary, lore log.
- D&D sourcebook design: book-spine architecture, homepage and deities page designs.
- Areshatlas.com design evaluation: site audit, mobile fix, "slop leak" audit, design canvas.
- Image diagnostic concerns: not summarized here.

## Project docs

`claude/areshnaat-lore-log.md`, `claude/xibanal-core-spec.md`, `claude/xibanal-dictionary-v2.md`, `claude/xibanal-domains-v1.md`, `claude/xibanal-pantheon-v2.md`, `claude/session-2026-10-11-scripts-and-handoff.md`. Readable from chats in the project, not from the CLI.
