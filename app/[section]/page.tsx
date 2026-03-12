import Link from "next/link";
import { notFound } from "next/navigation";
import CoordinateRule from "@/components/codex/CoordinateRule";
import CornerOrnament from "@/components/codex/CornerOrnament";
import EntryCard from "@/components/codex/EntryCard";
import PlateLabel from "@/components/codex/PlateLabel";
import { getSectionBySlug, getSectionEntries, sections } from "@/lib/codexContent";

type SectionPageProps = {
  params: Promise<{
    section: string;
  }>;
};

export function generateStaticParams() {
  return sections.map((section) => ({ section: section.slug }));
}

export default async function SectionPage({ params }: SectionPageProps) {
  const { section: sectionSlug } = await params;
  const section = getSectionBySlug(sectionSlug);
  if (!section) notFound();

  const entries = getSectionEntries(section);

  return (
    <main className="min-h-screen px-6 py-12 text-stone-900 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.26em] text-amber-800 transition hover:text-amber-950"
        >
          Return to Survey Archive
        </Link>
        <div className="mt-6 max-w-3xl">
          <PlateLabel>{section.label}</PlateLabel>
          <h1 className="mt-4 font-display text-4xl tracking-tight text-amber-950">
            {section.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-stone-700">{section.summary}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.24em] text-amber-700">
            Mirrored Source Folder: content/{section.folder}
          </p>
          <CoordinateRule />
        </div>

        <section className="mt-10">
          {entries.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {entries.map((entry) => (
                <EntryCard
                  key={`${entry.domain}:${entry.title}`}
                  title={entry.title}
                  domain={entry.domain}
                  summary={entry.summary}
                />
              ))}
            </div>
          ) : (
            <article className="border border-amber-300 bg-amber-50/80 p-6 text-sm leading-6 text-stone-700">
              No mirrored entries are present in this folder yet. Run `npm run sync:codex`
              after adding content to the vault source.
            </article>
          )}
        </section>
      </div>

      <CornerOrnament position="bottom-right" />
    </main>
  );
}
