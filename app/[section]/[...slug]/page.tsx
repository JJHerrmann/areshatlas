import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleHeader from "@/components/codex/ArticleHeader";
import CornerOrnament from "@/components/codex/CornerOrnament";
import DeityInfobox from "@/components/codex/DeityInfobox";
import DeityProfile from "@/components/codex/DeityProfile";
import EntryCard from "@/components/codex/EntryCard";
import GenericInfobox from "@/components/codex/GenericInfobox";
import NavboxFooter from "@/components/codex/NavboxFooter";
import NationInfobox from "@/components/codex/NationInfobox";
import Provenance from "@/components/codex/Provenance";
import {
  getDeityCompletion,
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
import { canonicalPath, cleanDescription, demoteLeadingH1, isNoindexFrontmatter, explicitSummary } from "@/lib/seo";

const STUB_REQUEST_HREF = "https://github.com/JJHerrmann/areshatlas/issues/new";

function getArticleDek(frontmatter: Record<string, unknown>, fallback: string) {
  const type = typeof frontmatter.type === "string" ? frontmatter.type : "";
  if (type === "deity") {
    const epithet = typeof frontmatter.epithet === "string" ? frontmatter.epithet.trim() : "";
    const honorific = typeof frontmatter.honorific_title === "string" ? frontmatter.honorific_title.trim() : "";
    return [epithet, honorific].filter(Boolean).join(" · ") || fallback;
  }
  return fallback;
}

function getStubCategory(frontmatter: Record<string, unknown>, sectionTitle: string) {
  const type = typeof frontmatter.type === "string" ? frontmatter.type.trim().toLowerCase() : "";
  if (type) return type;
  return sectionTitle.trim().toLowerCase();
}

function getArticleStatusNotice(frontmatter: Record<string, unknown>, sectionTitle: string) {
  const completion = getDeityCompletion(frontmatter);
  if (!completion?.isStub) return null;
  const category = getStubCategory(frontmatter, sectionTitle);
  return (
    <>
      <p>
        This article is a stub relating to{" "}
        <strong>{category}</strong>. You can help expand it by submitting a character
        that uses the related information.
      </p>
      <p>
        To request more information about this article, please{" "}
        <a href={STUB_REQUEST_HREF} target="_blank" rel="noreferrer">
          open a codex request
        </a>
        .
      </p>
    </>
  );
}

type NestedSectionPageProps = {
  params: Promise<{
    section: string;
    slug: string[];
  }>;
};

export async function generateMetadata({ params }: NestedSectionPageProps): Promise<Metadata> {
  const { section: sectionSlug, slug } = await params;
  const section = getSectionBySlug(sectionSlug);
  if (!section) return {};

  const url = canonicalPath(section.slug, ...slug);
  const base = (title: string, description: string, noindex = false): Metadata => ({
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "article", title, description, url },
    twitter: { title, description },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  });

  const view = getSectionView(section, slug);
  const overviewDocument = view ? await getRenderedOverviewDocument(section, slug) : null;
  if (view && overviewDocument) {
    return base(
      overviewDocument.title,
      cleanDescription(overviewDocument.summary, section.summary),
      isNoindexFrontmatter(overviewDocument.frontmatter),
    );
  }

  const document = await getRenderedDocument(section, slug);
  if (document) {
    const isStub = getDeityCompletion(document.frontmatter)?.isStub ?? false;
    return base(
      document.title,
      cleanDescription(document.summary, section.summary),
      isStub || isNoindexFrontmatter(document.frontmatter),
    );
  }

  if (view) {
    const title = view.breadcrumb[view.breadcrumb.length - 1]?.title ?? section.title;
    return base(title, cleanDescription(section.summary, section.summary));
  }

  return {};
}

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
            dek={explicitSummary(overviewDocument.frontmatter) || undefined}
            searchItems={searchItems}
          />

          <article
            className="codex-entry-body codex-prose mt-10"
            data-article-outline-root="true"
            dangerouslySetInnerHTML={{ __html: demoteLeadingH1(overviewDocument.html) }}
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
                    meta={entry.meta}
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
          <Provenance html={overviewDocument.provenance} />
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
    const genericInfobox =
      !nationSidebar && !deitySidebar && document.infobox ? document.infobox : null;
    const hasSidebar = Boolean(nationSidebar) || Boolean(deitySidebar) || Boolean(genericInfobox);
    const isDeity = Boolean(deitySidebar) || document.frontmatter?.type === "deity";
    return (
      <main className="min-h-screen px-6 py-12 text-stone-900 lg:px-8">
        <div className="codex-page-inner">
          <ArticleHeader
            breadcrumbs={document.breadcrumb}
            label={section.label}
            title={document.title}
            dek={getArticleDek(document.frontmatter, explicitSummary(document.frontmatter))}
            statusNotice={getArticleStatusNotice(document.frontmatter, section.title)}
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
                dangerouslySetInnerHTML={{ __html: demoteLeadingH1(document.html) }}
              />
            )}
            {nationSidebar ? <NationInfobox data={nationSidebar} /> : null}
            {deitySidebar ? <DeityInfobox data={deitySidebar} /> : null}
            {genericInfobox ? (
              <GenericInfobox
                title={document.title}
                infobox={genericInfobox}
                hemisphereViews={document.hemisphereViews}
                world={document.world}
                sourceRelativePath={document.sourcePath}
              />
            ) : null}
          </div>

          {article ? <NavboxFooter navboxes={navboxes} currentSlug={article.slug} /> : null}
          <Provenance html={document.provenance} />
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
                  meta={entry.meta}
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
