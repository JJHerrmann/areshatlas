import Link from "next/link";
import { notFound } from "next/navigation";
import CoordinateRule from "@/components/codex/CoordinateRule";
import CornerOrnament from "@/components/codex/CornerOrnament";
import EntryCard from "@/components/codex/EntryCard";
import InlineCodexText from "@/components/codex/InlineCodexText";
import PlateLabel from "@/components/codex/PlateLabel";
import { getRenderedOverviewDocument, getSectionBySlug, getSectionView, sections } from "@/lib/codexContent";

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

  const view = getSectionView(section);
  if (!view) notFound();
  const overviewDocument = await getRenderedOverviewDocument(section, []);
  const entries = view.entries;

  return (
    <main className="min-h-screen px-6 py-12 text-stone-900 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="codex-backlink">
          Return to Survey Archive
        </Link>
        <div className="mt-6 max-w-3xl">
          <PlateLabel>{section.label}</PlateLabel>
          <h1 className="codex-page-title mt-4">
            <InlineCodexText text={overviewDocument?.title ?? section.title} />
          </h1>
          <p className="codex-source-note mt-3">
            Mirrored Source Folder: {view.sourcePath}
          </p>
          <CoordinateRule />
        </div>

        {overviewDocument ? (
          <>
            <article
              className="codex-entry-body codex-prose mt-10"
              dangerouslySetInnerHTML={{ __html: overviewDocument.html }}
            />
          </>
        ) : null}

        <section className="mt-10">
          {entries.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {entries.map((entry) => (
                <EntryCard
                  key={`${entry.domain}:${entry.title}`}
                  title={entry.title}
                  domain={entry.domain}
                  summary={entry.summary}
                  href={entry.href}
                  kind={entry.kind}
                />
              ))}
            </div>
          ) : (
            <article className="codex-empty-state p-6 text-sm leading-6">
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
