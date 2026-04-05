---
type: deity
name: ""
title: ""
slug: _gods_index
section: pantheon
epithet: ""
honorific_title: ""
pantheon: ""
divine_rank: ""
gender: ""
nature: ""
ethos: ""
major_influence: ""
minor_influences: []
spheres: []
avatars: []
avatar_image: ""
parents: []
siblings: []
offspring: []
consorts: []
allies: []
foes: []
dwelling_place: ""
dwelling_place_image: ""
primary_symbol: ""
primary_symbol_image: ""
secondary_symbols: []
secondary_symbol_images: []
sacred_number: ""
sacred_colors: []
forbidden_colors: []
sacred_stones: []
sacred_materials: []
sacred_objects: []
sacred_weapons: []
church_name: ""
central_authority: ""
regional_titles: []
temple_titles: []
clergy_titles: []
religious_orders: []
holy_texts: []
apocrypha: []
virtues: []
vices: []
holy_days: []
taboos: []
summary: ""
card_summary: ""
physical_description: ""
form_1_name: ""
form_1_image: ""
form_1_description: ""
form_2_name: ""
form_2_image: ""
form_2_description: ""
form_3_name: ""
form_3_image: ""
form_3_description: ""
symbolism_notes: ""
dwelling_place_description: ""
servants_description: ""
doctrine_overview: ""
holy_text_1: ""
holy_text_1_summary: ""
holy_text_2: ""
holy_text_2_summary: ""
apocrypha_1: ""
apocrypha_1_summary: ""
apocrypha_2: ""
apocrypha_2_summary: ""
apocrypha_3: ""
apocrypha_3_summary: ""
virtue_1: ""
virtue_1_description: ""
virtue_2: ""
virtue_2_description: ""
virtue_3: ""
virtue_3_description: ""
vice_1: ""
vice_1_description: ""
vice_2: ""
vice_2_description: ""
vice_3: ""
vice_3_description: ""
theological_mission: ""
social_mission: ""
regional_authority_description: ""
temple_hierarchy_description: ""
priesthood_description: ""
order_1: ""
order_1_description: ""
order_2: ""
order_2_description: ""
order_3: ""
order_3_description: ""
garments_overview: ""
laity_garb: ""
acolyte_garb: ""
ordained_garb: ""
senior_garb: ""
special_order_garb: ""
practices_overview: ""
holy_day_1_name: ""
holy_day_1_date: ""
holy_day_1_observed_by: ""
holy_day_1_description: ""
holy_day_2_name: ""
holy_day_2_date: ""
holy_day_2_observed_by: ""
holy_day_2_description: ""
customs_description: ""
rite_name: ""
rite_description: ""
taboo_1: ""
taboo_2: ""
taboo_3: ""
notes: ""
related_deity_1: ""
related_deity_2: ""
related_deity_3: ""
navboxes: []
tags:
  - deity
  - religion
---
```dataviewjs
const currentFile = dv.current().file.path;
const currentFolder = dv.current().file.folder;
const emojiStart = /^\p{Extended_Pictographic}/u;

const pages = dv.pages(`"${currentFolder}"`)
  .where(p =>
    p.file &&
    p.file.path !== currentFile &&
    p.file.path.endsWith(".md") &&
    emojiStart.test(p.file.name)
  )
  .sort(p => p.file.name, "asc");

const rows = pages.map(p => {
  const row = { File: p.file.name };
  for (const key of Object.keys(p)) {
    if (key === "file") continue;
    row[key] = p[key];
  }
  return row;
});

const columns = ["File"];
for (const row of rows) {
  for (const key of Object.keys(row)) {
    if (!columns.includes(key)) columns.push(key);
  }
}

function stringify(value) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(stringify).join("; ");
  if (typeof value === "object") {
    if (value.path) return value.path;
    return JSON.stringify(value);
  }
  return String(value);
}

function csvEscape(value) {
  const s = stringify(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const csv = [
  columns.map(csvEscape).join(","),
  ...rows.map(row => columns.map(col => csvEscape(row[col])).join(","))
].join("\n");

const container = dv.el("div", "");
const textarea = container.createEl("textarea", {
  text: csv
});

textarea.style.width = "100%";
textarea.style.minHeight = "400px";
textarea.style.whiteSpace = "pre";
textarea.style.fontFamily = "monospace";
textarea.style.fontSize = "0.9em";
textarea.style.padding = "0.75em";
```
