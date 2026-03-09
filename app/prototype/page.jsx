export default function AreshSourcebookPrototype() {
  const toc = [
    {
      title: "Introduction",
      page: 1,
      children: [
        { title: "Welcome to Aresh", page: 1 },
        { title: "Dreams of Divinity", page: 2 },
        { title: "Languages", page: 3 },
      ],
    },
    {
      title: "Geography of Aresh",
      page: 5,
      children: [
        { title: "Continents", page: 5 },
        { title: "Oceans", page: 7 },
        { title: "Ecology", page: 8 },
      ],
    },
    {
      title: "History of Aresh",
      page: 11,
      children: [
        { title: "Age of the Gods", page: 11 },
        { title: "The First Age of Man", page: 13 },
        { title: "The Great Darkness", page: 15 },
        { title: "The Second Age of Man", page: 17 },
        { title: "The Long Night", page: 19 },
        { title: "The Third Age of Man", page: 21 },
        { title: "The Dark Times", page: 23 },
        { title: "The Fourth Age of Man", page: 25 },
      ],
    },
    {
      title: "Culture",
      page: 30,
      children: [
        { title: "Time", page: 30 },
        { title: "Holidays and Festivals", page: 31 },
        { title: "Languages", page: 32 },
        { title: "Organizations", page: 34 },
        { title: "Economy and Trade", page: 36 },
        { title: "Technology", page: 38 },
      ],
    },
    {
      title: "Peoples of Aresh",
      page: 42,
      children: [
        { title: "Humans", page: 42 },
        { title: "Elves", page: 44 },
        { title: "Dwarves", page: 46 },
        { title: "Giants", page: 48 },
        { title: "Fey", page: 50 },
        { title: "Half-Elves", page: 52 },
        { title: "Orcs", page: 54 },
        { title: "Halflings", page: 56 },
        { title: "Goblins", page: 58 },
        { title: "Minotaurs", page: 60 },
        { title: "Merfolk", page: 62 },
        { title: "Lizardfolk", page: 64 },
        { title: "Centaurs", page: 66 },
        { title: "Dragons", page: 68 },
      ],
    },
    {
      title: "Magic in Aresh",
      page: 72,
      children: [
        { title: "Emanations of Magic", page: 72 },
        { title: "Paths of Magic", page: 74 },
        { title: "The Barricades", page: 76 },
        { title: "Spells", page: 78 },
      ],
    },
    {
      title: "Religion",
      page: 82,
      children: [
        { title: "Faiths of Aresh", page: 82 },
        { title: "Cosmology", page: 84 },
        { title: "Religion in Daily Life", page: 86 },
        { title: "Deities", page: 88 },
      ],
    },
    {
      title: "Rules",
      page: 95,
      children: [
        { title: "Campaign", page: 95 },
        { title: "Character Creation", page: 97 },
        { title: "Advantages", page: 99 },
        { title: "Disadvantages", page: 101 },
        { title: "Skills", page: 103 },
        { title: "Magic", page: 105 },
        { title: "Psionics", page: 107 },
        { title: "Templates", page: 109 },
        { title: "Equipment", page: 111 },
        { title: "Character Development", page: 113 },
      ],
    },
    {
      title: "Sourcebooks",
      page: 120,
    },
  ];

  const stats = [
    ["Catalog Chapters", "6"],
    ["Divine Aspects", "15"],
    ["Surveyed Regions", "18+"],
    ["Observed Creatures", "40+"],
  ];

  const divisions = [
    ["Pantheon", "Catalog of divine manifestations and sacred rites."],
    ["Regions", "Mapped territories and geographic observations."],
    ["Cultures", "Peoples, languages, and customs of Aresh."],
    ["Bestiary", "Creatures documented through expedition accounts."],
    ["Relics", "Artifacts and magical traditions."],
    ["Chronicles", "Historic conflicts and recorded events."],
  ];

  const sampleSections = [
    {
      id: "cartographer-intro",
      title: "Survey of Aresh",
      kind: "Cartographic Preface",
      summary:
        "Compiled by Herodetus Darwin, Half-Elf of the Line of Ashen. These pages represent an ongoing survey of lands, cultures, creatures, and divine phenomena across the world of Aresh.",
    },
    {
      id: "pantheon",
      title: "Catalog of Divine Aspects",
      kind: "Theological Survey",
      summary:
        "Each deity or divine aspect is recorded according to observed domains, rites, symbols, and regional influence.",
    },
    {
      id: "regions",
      title: "Geographic Surveys",
      kind: "Cartographic Records",
      summary:
        "Regions are recorded with terrain descriptions, known settlements, trade paths, hazards, and ecological observations.",
    },
    {
      id: "bestiary",
      title: "Natural Observations",
      kind: "Bestiary",
      summary:
        "Catalog of notable fauna and supernatural entities encountered during expeditions.",
    },
  ];

  const flatten = (items, depth = 0) =>
    items.flatMap((item) => [
      { ...item, depth },
      ...(item.children ? flatten(item.children, depth + 1) : []),
    ]);

  const flatToc = flatten(toc);

  const sanityChecks = [
    {
      name: "TOC has entries",
      pass: flatToc.length > 0,
    },
    {
      name: "Stats count is four",
      pass: stats.length === 4,
    },
    {
      name: "All sample sections have ids",
      pass: sampleSections.every((section) => Boolean(section.id)),
    },
  ];

  const failedChecks = sanityChecks.filter((check) => !check.pass);
  if (failedChecks.length > 0) {
    throw new Error(
      `Prototype sanity checks failed: ${failedChecks
        .map((check) => check.name)
        .join(", ")}`
    );
  }

  const CompassRose = () => (
    <svg viewBox="0 0 120 120" className="h-24 w-24 text-amber-900" aria-hidden="true">
      <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="40" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" />
      <path d="M60 8 L67 53 L60 60 L53 53 Z" fill="currentColor" />
      <path d="M60 112 L53 67 L60 60 L67 67 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 60 L53 53 L60 60 L53 67 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M112 60 L67 67 L60 60 L67 53 Z" fill="currentColor" />
      <path d="M24 24 L50 50" stroke="currentColor" strokeWidth="1" />
      <path d="M96 24 L70 50" stroke="currentColor" strokeWidth="1" />
      <path d="M24 96 L50 70" stroke="currentColor" strokeWidth="1" />
      <path d="M96 96 L70 70" stroke="currentColor" strokeWidth="1" />
      <circle cx="60" cy="60" r="6" fill="currentColor" />
      <text x="60" y="20" textAnchor="middle" fontSize="10" fill="currentColor">N</text>
      <text x="60" y="106" textAnchor="middle" fontSize="10" fill="currentColor">S</text>
      <text x="16" y="63" textAnchor="middle" fontSize="10" fill="currentColor">W</text>
      <text x="104" y="63" textAnchor="middle" fontSize="10" fill="currentColor">E</text>
    </svg>
  );

  const CornerOrnament = ({ className = "" }) => (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        d="M8 56 C8 30, 30 8, 56 8 M20 56 C20 36, 36 20, 56 20 M8 44 C24 44, 44 24, 44 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="44" cy="20" r="2" fill="currentColor" />
      <circle cx="20" cy="44" r="2" fill="currentColor" />
    </svg>
  );

  const PlateLabel = ({ children }) => (
    <div className="inline-flex items-center gap-2 border border-amber-500/60 bg-amber-100/80 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-amber-900">
      <span className="block h-px w-4 bg-amber-700" />
      {children}
      <span className="block h-px w-4 bg-amber-700" />
    </div>
  );

  const CoordinateRule = () => (
    <div className="pointer-events-none absolute inset-x-6 top-3 hidden items-center justify-between text-[10px] uppercase tracking-[0.25em] text-amber-700/70 lg:flex">
      <span>Lat. XXIII N</span>
      <span>Meridian of Shekelarmesh</span>
      <span>Long. XIV E</span>
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-amber-50 text-stone-900">
      <div className="pointer-events-none absolute inset-0 opacity-[0.16]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(120,53,15,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(120,53,15,0.08) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at center, transparent 0%, rgba(120,53,15,0.03) 65%, rgba(68,38,8,0.09) 100%)",
          }}
        />
      </div>

      <div className="pointer-events-none absolute left-3 top-3 text-amber-800/70">
        <CornerOrnament className="h-16 w-16" />
      </div>
      <div className="pointer-events-none absolute right-3 top-3 rotate-90 text-amber-800/70">
        <CornerOrnament className="h-16 w-16" />
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 -rotate-90 text-amber-800/70">
        <CornerOrnament className="h-16 w-16" />
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 rotate-180 text-amber-800/70">
        <CornerOrnament className="h-16 w-16" />
      </div>

      <CoordinateRule />

      <div className="relative border-b border-amber-300 bg-amber-100/95">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <PlateLabel>Survey Archive of Aresh</PlateLabel>
            <div className="text-[10px] uppercase tracking-[0.28em] text-amber-800">
              Plate I. General Frontispiece
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <h1 className="text-4xl font-serif tracking-tight lg:text-5xl">
                The Natural and Geographic Survey of Aresh
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-700">
                Maintained by Herodetus Darwin, Half-Elf of the Line of Ashen,
                Scribe of the Halls of Shekelarmesh. These records document the
                geography, peoples, creatures, and divine influences observed
                across the world of Aresh.
              </p>

              <div className="mt-4 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.22em] text-amber-800">
                <span className="border border-amber-400/70 px-3 py-1">
                  Compiled in the Halls of Shekelarmesh
                </span>
                <span className="border border-amber-400/70 px-3 py-1">
                  Revised under the Ashen Line
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 lg:items-end">
              <div className="rounded-full border border-amber-400/80 bg-amber-50/80 p-3 shadow-sm">
                <CompassRose />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-2">
                {stats.map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded border border-amber-300 bg-amber-50 px-4 py-3"
                  >
                    <div className="text-xl font-semibold text-amber-900">
                      {value}
                    </div>
                    <div className="text-xs uppercase tracking-wide text-amber-700">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-8">
        <aside className="relative rounded border border-amber-300 bg-amber-100/95 p-4 shadow-sm">
          <div className="pointer-events-none absolute inset-x-3 top-2 border-t border-amber-500/50" />
          <div className="pointer-events-none absolute inset-x-3 bottom-2 border-t border-amber-500/40" />

          <div className="mb-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-900">
                Table of Contents
              </h2>
              <span className="text-[10px] uppercase tracking-[0.24em] text-amber-700">
                Survey Plate II
              </span>
            </div>
            <p className="mt-1 text-xs text-amber-700">
              Extract from the compiled survey volumes.
            </p>
          </div>

          <nav className="space-y-1">
            {flatToc.map((item) => (
              <a
                key={`${item.title}-${item.page}`}
                href="#"
                className="flex items-start justify-between gap-3 rounded border-b border-amber-300/40 px-3 py-2 text-sm hover:bg-amber-200/70"
                style={{ paddingLeft: `${12 + item.depth * 16}px` }}
              >
                <span>{item.title}</span>
                <span className="text-amber-700">{item.page}</span>
              </a>
            ))}
          </nav>
        </aside>

        <main className="space-y-6">
          <section className="relative rounded border border-amber-300 bg-amber-50 p-8 shadow-sm">
            <div className="pointer-events-none absolute left-3 top-3 text-amber-700/60">
              <CornerOrnament className="h-10 w-10" />
            </div>
            <div className="pointer-events-none absolute right-3 top-3 rotate-90 text-amber-700/60">
              <CornerOrnament className="h-10 w-10" />
            </div>

            <PlateLabel>Survey Plate III</PlateLabel>
            <p className="mt-4 text-xs uppercase tracking-[0.3em] text-amber-800">
              Cartographic Structure
            </p>

            <h2 className="mt-3 text-3xl font-serif">
              Organization of the Survey
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {divisions.map(([title, body]) => (
                <div
                  key={title}
                  className="relative rounded border border-amber-300 bg-amber-100 p-5 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-[10px] uppercase tracking-[0.22em] text-amber-700">
                      Mapped Division
                    </span>
                    <span className="h-px flex-1 bg-amber-400/70" />
                  </div>
                  <h3 className="text-lg font-serif text-amber-900">{title}</h3>
                  <p className="mt-2 text-sm text-amber-800">{body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="relative rounded border border-amber-300 bg-amber-50 p-8 shadow-sm">
            <div className="pointer-events-none absolute left-3 top-3 text-amber-700/60">
              <CornerOrnament className="h-10 w-10" />
            </div>
            <div className="pointer-events-none absolute right-3 top-3 rotate-90 text-amber-700/60">
              <CornerOrnament className="h-10 w-10" />
            </div>

            <PlateLabel>Survey Plate IV</PlateLabel>
            <p className="mt-4 text-xs uppercase tracking-[0.3em] text-amber-800">
              Field Records
            </p>

            <h2 className="mt-3 text-3xl font-serif">Catalog Entries</h2>

            <div className="mt-6 space-y-4">
              {sampleSections.map((section) => (
                <article
                  id={section.id}
                  key={section.id}
                  className="relative rounded border border-amber-300 bg-amber-100 p-5 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.22em] text-amber-700">
                    <span>Recorded Entry</span>
                    <span className="h-px flex-1 bg-amber-400/70" />
                    <span>Archive Folio</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-serif">{section.title}</h3>
                    <span className="border border-amber-400 px-3 py-1 text-xs uppercase tracking-wide text-amber-900">
                      {section.kind}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-amber-800">
                    {section.summary}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded border border-amber-300 bg-amber-100/80 p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-serif text-amber-900">Prototype Sanity Checks</h2>
              <span className="text-[10px] uppercase tracking-[0.22em] text-amber-700">
                Runtime Tests
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {sanityChecks.map((check) => (
                <div
                  key={check.name}
                  className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                >
                  <div className="font-medium">{check.name}</div>
                  <div className="text-xs uppercase tracking-wide text-amber-700">
                    {check.pass ? "Pass" : "Fail"}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
