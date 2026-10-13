# Chat instructions for Areshnaat

Read this first, in any Claude chat, Claude Code session, or CLI session working on Areshnaat. It says where things live, what the rules are, and how to hand work to the next session. The current state of the world and the work is in `STATE.md` next to this file.

This repo is public on GitHub. Everything on every branch, including this branch, can be read by anyone. Write accordingly.

## How to find this

- Repo: `JJHerrmann/areshatlas`. Branch: `chat/instructions`. Files: `chat/INSTRUCTIONS.md`, `chat/STATE.md`.
- Shallow clones only track one branch. To read this branch: `git clone --depth 1 --branch chat/instructions https://github.com/JJHerrmann/areshatlas`, or in an existing clone `git fetch --depth 1 origin chat/instructions` and read `FETCH_HEAD`.
- In a claude.ai Code session, attach the repo with add_repo (push access), clone once, then register the clone root. The git proxy allows two concurrent git operations, so never clone in parallel. Give the clone a generous timeout.
- The live handoff log is `CLAUDE CONVERSATION.md` at the repo root on `main`. This branch holds the instructions and the state digest. The log holds the conversation.

## What lives where

| Place | What it is | Who reads and writes |
|---|---|---|
| Obsidian vault (Rook's machine, outside the repo) | Source of truth for lore notes. Folders are site sections: `gods/`, `regions/`, `cultures/`, `chronicles/`, `creatures/`, `relics/`. | CLI writes. Chats cannot see it. |
| `content/` in this repo | The synced, scrubbed copy the site builds from. | CLI. Do not hand-edit. |
| `CLAUDE CONVERSATION.md` (root, `main`) | Shared handoff log between Rook, the chat sessions and the CLI. | Everyone, `main` only. |
| `chat/` on this branch | These instructions and the state digest. | Chats and CLI. |
| Claude Project "Areshnaat" | Project docs (session summaries, Xibanal spec, pantheon, dictionary, lore log) and project memory. | Chats in the project. The CLI cannot read it unless its session is attached. |
| Artifacts on claude.ai | Interactive pages: atlas, Kedantlan, Australopithecus camp, species, dwarves codex, design canvas. | Chats publish. Anyone with the link and access reads. |
| Chat transcripts | Not shared. A chat can only read others if it has the chat-search tools. | Do not rely on them. |

## Rules

1. **DM material never goes in this repo.** The CLI scrub strips DM callouts at sync, which protects the published website. It does not protect GitHub. Any DM text committed anywhere in this public repo, on any branch, is readable by anyone and stays in history. Hand DM material to Rook or the CLI as a file, never as a commit. (The root handoff file and everything under `chat/` are the strictest cases: never.) A line in the log from the CLI says callouts are safe to hand over in the repo. That is true for the site only.
2. **Do not decide lore.** Show both readings, give a lean if you have one, and let Rook rule. Tags: **canon** (Rook decided), **proposed** (suggested, awaiting a yes), **open** (undecided), **modelled** (model output, not authored lore).
3. **Say what you did not verify.** Rook trusts investigation over guessing and wants uncertainty flagged. Check git state directly instead of assuming a push worked.
4. **Ask rather than guess facts** about who holds which trait or what a thing is called. Rook corrects guesses repeatedly.
5. **Produce, do not interrogate.** One question at most per reply, and only if it changes what you do. Do not end every reply with a question.
6. **Style.** Concise and direct, a little dry. ASCII punctuation only: no em dashes, en dashes or curly quotes. No exclamation marks. Separate fact, inference, speculation and metaphor.
7. **After publishing an artifact**, say what it is in one sentence. Do not paste the URL unless asked.

## Handoff protocol

- The log is `CLAUDE CONVERSATION.md` on `main`. Append your entry at the bottom under your own party heading, one subsection per party (Rook, Claude chat, CLI, Seraphim design chat). Sign and date every entry. Push the file to `main` itself. Branch for code and everything else.
- Put work for another party in that party's Open list. When it is done, move it to the Log with one line saying what changed.
- Pull before you edit and push right after, so entries do not collide.
- Keep figures and notes to hand over in `handoff/`, public-safe only. The CLI files them in the vault and may delete the folder afterward.

## Session checklist

Start:
1. Pull `main`. Read the Open list for your party in the log.
2. Read `chat/STATE.md` on this branch.
3. Check the date of the last log entry against what Rook tells you, since another session may have moved things.

End:
1. Append a dated entry to the log on `main`.
2. If canon changed, update `chat/STATE.md` and push this branch.
3. If a decision is durable and belongs in the project, write it to the project docs.

## Notes on the pipeline (from the CLI)

- Every note needs frontmatter `name:` or a leading `#` heading, or the page title falls back to raw prose.
- Use the shortest wikilink format. `![[image.png]]` embeds render as images. Obsidian callouts render as styled callouts.
- Empty notes do not publish. They stay in the vault as placeholders.
- A card summary falls back to the epithet when frontmatter has no `summary`.
- The scrub removes callouts typed `dm`, `secret` or `spoiler`, callouts whose title starts with "DM", and anything between `<!-- dm:start -->` and `<!-- dm:end -->`. An unterminated fence stops the publish.
- Publishing work happens on `areshnaat-publishing` before it reaches `main`.
