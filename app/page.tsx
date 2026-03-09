import SectionCard from "@/components/codex/SectionCard";
import CompassRose from "@/components/codex/CompassRose";
import CoordinateRule from "@/components/codex/CoordinateRule";
import CornerOrnament from "@/components/codex/CornerOrnament";
import PlateLabel from "@/components/codex/PlateLabel";

export default function HomePage() {
  const sections = [
    {
      title: "Pantheon",
      label: "Catalog of Divine Aspects",
      summary: "Survey of gods, rites, symbols, and divine domains recorded across Aresh.",
    },
    {
      title: "Regions",
      label: "Geographic Surveys",
      summary: "Mapped territories, settlements, routes, hazards, and ecological observations.",
    },
    {
      title: "Cultures",
      label: "Ethnographic Records",
      summary: "Peoples, languages, lineages, customs, and social memory of the known world.",
    },
    {
      title: "Relics and Magic",
      label: "Artifacts and Arcana",
      summary: "Catalog of relics, magical traditions, rites, and notable materials.",
    },
    {
      title: "Creatures and Powers",
      label: "Natural Observations",
      summary: "Bestiary entries, supernatural entities, and expedition-derived accounts.",
    },
    {
      title: "Chronicles",
      label: "Recorded Histories",
      summary: "Events, conflicts, dynasties, migrations, and remembered cataclysms.",
    },
  ];

  return (
    <main className="min-h-screen text-stone-900">
      <section className="border-b border-amber-300/80 bg-amber-100/80">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="flex items-start justify-between gap-8">
            <div className="max-w-4xl">
              <PlateLabel>Survey Archive of Aresh</PlateLabel>
              <h1 className="mt-4 font-display text-4xl tracking-tight lg:text-6xl">
                The Natural and Geographic Survey of Aresh
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-stone-700">
                A codex of lands, peoples, creatures, relics, and divine influences,
                presented in the manner of a pre-industrial cartographic archive.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.22em] text-amber-800">
                <span className="border border-amber-400/70 px-3 py-1">Herodetus Darwin</span>
                <span className="border border-amber-400/70 px-3 py-1">Line of Ashen</span>
                <span className="border border-amber-400/70 px-3 py-1">Halls of Shekelarmesh</span>
              </div>
            </div>
            <div className="hidden lg:block">
              <CompassRose />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.28em] text-amber-800">Codex Divisions</p>
          <h2 className="mt-3 font-display text-3xl">Principal Surveys</h2>
          <CoordinateRule />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <SectionCard
              key={section.title}
              title={section.title}
              label={section.label}
              summary={section.summary}
            />
          ))}
        </div>
      </section>

      <CornerOrnament position="bottom-right" />
    </main>
  );
}
