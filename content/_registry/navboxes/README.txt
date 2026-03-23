Central navbox definitions live here as JSON files.

Expected shape:

{
  "id": "twelve-olympians",
  "title": "Twelve Olympians",
  "mode": "footer",
  "items": [
    "aphrodite",
    "apollo",
    "ares"
  ]
}

Notes:
- Article notes should only declare flat `navboxes` membership in front matter.
- `items` should use canonical article slugs or aliases.
- The build validates navbox ids referenced by articles and navbox members against resolved articles.
