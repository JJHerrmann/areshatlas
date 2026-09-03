import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleHeader from "@/components/codex/ArticleHeader";
import CornerOrnament from "@/components/codex/CornerOrnament";
import EntryCard from "@/components/codex/EntryCard";
import Provenance from "@/components/codex/Provenance";
import {
  getRenderedOverviewDocument,
  getSearchableArticles,
  getSectionBySlug,
  getSectionEntryCount,
  getSectionView,
  sections,
} from "@/lib/codexContent";
import { canonicalPath, cleanDescription, demoteLeadingH1, explicitSummary } from "@/lib/seo";

type SectionPageProps = {
  params: Promise<{
    section: string;
  }>;
};

export function generateStaticParams() {
  return sections.map((section) => ({ section: section.slug }));
}

export async function generateMetadata({ params }: SectionPageProps): Promise<Metadata> {
  const { section: sectionSlug } = await params;
  const section = getSectionBySlug(sectionSlug);
  if (!section) return {};

  const overviewDocument = await getRenderedOverviewDocument(section, []);
  const title = overviewDocument?.title ?? section.title;
  const description = cleanDescription(overviewDocument?.summary ?? section.summary, section.summary);
  const url = canonicalPath(section.slug);
  const isEmpty = getSectionEntryCount(section) === 0;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", title, description, url },
    twitter: { title, description },
    // Sections with no published entries yet are thin — keep them out of the index.
    ...(isEmpty ? { robots: { index: false, follow: true } } : {}),
  };
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
          dek={(overviewDocument && explicitSummary(overviewDocument.frontmatter)) || section.summary}
          sourceNote={`Mirrored Source Folder: ${view.sourcePath}`}
          searchItems={searchItems}
        />

        {overviewDocument ? (
          <>
            <article
              className="codex-entry-body codex-prose mt-10"
              data-article-outline-root="true"
              dangerouslySetInnerHTML={{ __html: demoteLeadingH1(overviewDocument.html) }}
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
                  meta={entry.meta}
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

        {overviewDocument ? <Provenance html={overviewDocument.provenance} /> : null}
      </div>

      <CornerOrnament position="bottom-right" />
    </main>
  );
}
