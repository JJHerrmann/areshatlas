import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleHeader from "@/components/codex/ArticleHeader";
import CornerOrnament from "@/components/codex/CornerOrnament";
import DeityInfobox from "@/components/codex/DeityInfobox";
import DeityProfile from "@/components/codex/DeityProfile";
import EntryCard from "@/components/codex/EntryCard";
import NavboxFooter from "@/components/codex/NavboxFooter";
import NationInfobox from "@/components/codex/NationInfobox";
import {
  getDeitySidebar,
  getDerivedArticle,
  getNavboxesForSourcePath,
  getNationSidebar,
  getRenderedDocument,
  getRenderedOverviewDocument,
  getSearchableArticles,
  getSectionBySlug,
  getSectionView,
} from "@/lib/codexContent";

function getArticleDek(frontmatter: Record<string, unknown>, fallback: string) {
  const type = typeof frontmatter.type === "string" ? frontmatter.type : "";
  if (type === "deity") {
    const epithet = typeof frontmatter.epithet === "string" ? frontmatter.epithet.trim() : "";
    const honorific = typeof frontmatter.honorific_title === "string" ? frontmatter.honorific_title.trim() : "";
    return [epithet, honorific].filter(Boolean).join(" · ") || fallback;
  }
  return fallback;
}

type NestedSectionPageProps = {
  params: Promise<{
    section: string;
    slug: string[];
  }>;
};

export default async function NestedSectionPage({ params }: NestedSectionPageProps) {
  const { section: sectionSlug, slug } = await params;
  const section = getSectionBySlug(sectionSlug);
  if (!section) notFound();
  const searchItems = getSearchableArticles();

  const view = getSectionView(section, slug);
  const overviewDocument = view ? await getRenderedOverviewDocument(section, slug) : null;
  if (view && overviewDocument) {
    const overviewArticle = getDerivedArticle(overviewDocument.sourcePath);
    const overviewNavboxes = getNavboxesForSourcePath(overviewDocument.sourcePath);
    return (
      <main className="min-h-screen px-6 py-12 text-stone-900 lg:px-8">
        <div className="codex-page-inner">
          <ArticleHeader
            breadcrumbs={overviewDocument.breadcrumb}
            label={section.label}
            title={overviewDocument.title}
            dek={overviewDocument.summary}
            searchItems={searchItems}
          />

          <article
            className="codex-entry-body codex-prose mt-10"
            data-article-outline-root="true"
            dangerouslySetInnerHTML={{ __html: overviewDocument.html }}
          />

          <section className="mt-10">
            {view.entries.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {view.entries.map((entry) => (
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
                No immediate entries are present at this level of the codex tree yet.
              </article>
            )}
          </section>

          {overviewArticle ? <NavboxFooter navboxes={overviewNavboxes} currentSlug={overviewArticle.slug} /> : null}
        </div>

        <CornerOrnament position="bottom-right" />
      </main>
    );
  }

  const document = await getRenderedDocument(section, slug);
  if (document) {
    const nationSidebar = getNationSidebar(document.sourcePath);
    const deitySidebar = getDeitySidebar(document.sourcePath);
    const article = getDerivedArticle(document.sourcePath);
    const navboxes = getNavboxesForSourcePath(document.sourcePath);
    const hasSidebar = Boolean(nationSidebar) || Boolean(deitySidebar);
    const isDeity = Boolean(deitySidebar) || document.frontmatter?.type === "deity";
    return (
      <main className="min-h-screen px-6 py-12 text-stone-900 lg:px-8">
        <div className="codex-page-inner">
          <ArticleHeader
            breadcrumbs={document.breadcrumb}
            label={section.label}
            title={document.title}
            dek={getArticleDek(document.frontmatter, document.summary)}
            searchItems={searchItems}
            sourceRelativePath={document.sourcePath}
          />

          <div className={`codex-entry-layout mt-10${hasSidebar ? " with-sidebar" : ""}`}>
            {isDeity ? (
              <DeityProfile
                frontmatter={document.frontmatter}
                sourceRelativePath={document.sourcePath}
                bodyHtml={document.html}
              />
            ) : (
              <article
                className="codex-entry-body codex-prose"
                data-article-outline-root="true"
                dangerouslySetInnerHTML={{ __html: document.html }}
              />
            )}
            {nationSidebar ? <NationInfobox data={nationSidebar} /> : null}
            {deitySidebar ? <DeityInfobox data={deitySidebar} /> : null}
          </div>

          {article ? <NavboxFooter navboxes={navboxes} currentSlug={article.slug} /> : null}
        </div>

        <CornerOrnament position="bottom-right" />
      </main>
    );
  }

  if (!view) notFound();

  return (
    <main className="min-h-screen px-6 py-12 text-stone-900 lg:px-8">
      <div className="codex-page-inner">
        <ArticleHeader
          breadcrumbs={view.breadcrumb}
          label={section.label}
          title={view.breadcrumb[view.breadcrumb.length - 1]?.title ?? section.title}
          dek={section.summary}
          sourceNote={`Mirrored Source Folder: ${view.sourcePath}`}
          searchItems={searchItems}
        />

        <section className="mt-10">
          {view.entries.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {view.entries.map((entry) => (
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
              No immediate entries are present at this level of the codex tree yet.
            </article>
          )}
        </section>
      </div>

      <CornerOrnament position="bottom-right" />
    </main>
  );
}
