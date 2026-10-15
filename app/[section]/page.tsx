import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleHeader from "@/components/codex/ArticleHeader";
import CornerOrnament from "@/components/codex/CornerOrnament";
import EntryIndex from "@/components/codex/EntryIndex";
import Provenance from "@/components/codex/Provenance";
import {
  getRenderedOverviewDocument,
  getSearchableArticles,
  getSectionBySlug,
  getSectionEntryCount,
  getSectionView,
  sections,
} from "@/lib/codexContent";
import { canonicalPath, cleanDescription, demoteLeadingH1 } from "@/lib/seo";

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
          dek={overviewDocument?.summary ?? section.summary}
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
            <EntryIndex entries={entries} />
          ) : (
            <article className="codex-empty-state p-6 text-sm leading-6">
              Nothing has been filed here yet.
            </article>
          )}
        </section>

        {overviewDocument ? <Provenance html={overviewDocument.provenance} /> : null}
      </div>

      <CornerOrnament position="bottom-right" />
    </main>
  );
}
