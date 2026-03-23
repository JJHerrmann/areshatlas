---
navboxes: []
---


On Areshnaat, the gods are not just figments of a supernatural sense that explain natural phenomenon as in some worlds. On Areshnaat they are as real as you or I, living, although distant.

It's said that to the East, there is [[Ereslim]], and it is there where the gods of Areshnaat live, among verdant forests and high clifftops, and dangerously swift seas. No mortal has done more than see such things in rumor and old ship's hand tales. At least and has returned to the civilized world to tell of it.

Pantheon

[[Lotan]]
[[Yamnahar]]
[[Harbaal]]
[[Machul]]
[[Kathorharab]]
[[Ba'al Sheol]]
[[Malagad]]
[[Yatbara]]
[[Qatzera]]
[[Marmoqed]]
[[Yaradaat]]
[[Tsayidrah]]
[[Raavvah]]

```dataviewjs
dv.table(
  ["God", "Epithet"],
  dv.pages('"your/folder/path"')
    .where(p => p.epithet && String(p.epithet).trim() !== "")
    .sort(p => p.file.name, 'asc')
    .map(p => [p.file.link, p.epithet])
);
```