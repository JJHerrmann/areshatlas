---
title: Geography of Drakharpan
type: geography
world: Aresh
region_type: continent
status: draft
tags:
  - geography
  - continent
  - worldbuilding
---

# Geography of Drakharpan

## Overview

[Write 2 to 6 paragraphs summarizing the continent's scale, climate, wind patterns, major biomes, mountain systems, and coastlines.]

## Climate and Winds

- Prevailing winds: The northern winds come from the North East, blowing down towards the seamire and across 
- Northern climate: Drakharpan's northern climate is dominated by thick rocky plains and scrubgrass, dotted with deserts and a small western forest and wetlands.
- Central climate: The western coast has areas of hot desert, that retreats to savannah and forests as it moves eastward to 
- Southern climate: [description]

## Major Landforms

### Mountain Ranges
- [Range Name]: [short description]
- [Range Name]: [short description]

### Forests
- [Forest Name]: [short description]
- [Forest Name]: [short description]

### Swamps and Wetlands
- [Wetland Name]: [short description]
- [Wetland Name]: [short description]

### Lakes and Inland Waters
- [Lake Name or Group]: [short description]

## Surrounding Waters

- East: [[The Unending Tide]]
- West: [[The Western Shelf]]

Other notable waterways:
- [[The Seamire]]
- [Sea/Bay]
- [Sea/Bay]

## Islands and Peripheral Territories

- [Island/Region Name]: [note]
- [Island/Region Name]: [note]

## Subterranean Realms

- [Realm Name]: beneath [region], [description]
- [Realm Name]: beneath [region], [description]

```dataviewjs

const folder = "Authorship/roleplaying/worlds/aresh/codex-content/regions/Drakharpan/nations";

dv.header(2, "Nations and Realms");

const pages = dv.pages(`"${folder}"`)
  .where(p => p.file.folder === folder)
  .sort(p => p.file.name, "asc");

dv.list(
  pages.map(p => p.file.link)
);
```
## Geographic Regions

### Forests
- [Name]
- [Name]

### Highlands
- [Name]
- [Name]

### Swamps
- [Name]
- [Name]

### Waterways
- [Name]
- [Name]

## Political and Historical Notes

- [Note]
- [Note]
- [Note]