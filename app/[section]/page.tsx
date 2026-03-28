import { notFound } from "next/navigation";
import ArticleHeader from "@/components/codex/ArticleHeader";
import CornerOrnament from "@/components/codex/CornerOrnament";
import EntryCard from "@/components/codex/EntryCard";
import { getRenderedOverviewDocument, getSearchableArticles, getSectionBySlug, getSectionView, sections } from "@/lib/codexContent";

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
  const searchItems = getSearchableArticles();

  return (
    <main className="min-h-screen px-6 py-12 text-stone-900 lg:px-8">
      <div className="codex-page-inner">
        <ArticleHeader
          breadcrumbs={[{ title: section.title, href: `/${section.slug}` }]}
          label={section.label}
          title={overviewDocument?.title ?? section.title}
          dek={overviewDocument?.summary ?? section.summary}
          sourceNote={`Mirrored Source Folder: ${view.sourcePath}`}
          searchItems={searchItems}
        />

        {overviewDocument ? (
          <>
            <article
              className="codex-entry-body codex-prose mt-10"
              data-article-outline-root="true"
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
                  imageSrc={entry.imageSrc}
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
