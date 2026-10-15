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
import HistoryDiff from "@/components/codex/HistoryDiff";
import HistoryList from "@/components/codex/HistoryList";
import {
  compareRevisions,
  getRevision,
  getRevisionDiff,
  getRevisionText,
  getRevisions,
  hasHistory,
} from "@/lib/codexHistory";
import {
  getAllArticleParams,
  getDeityCompletion,
  getDeitySidebar,
  getDerivedArticle,
  getNavboxesForSourcePath,
  getNationSidebar,
  getRenderedDocument,
  getRenderedOverviewDocument,
  getRenderedRevision,
  getSearchableArticles,
  getSectionBySlug,
  getSectionView,
} from "@/lib/codexContent";
import { canonicalPath, cleanDescription, demoteLeadingH1, isNoindexFrontmatter, isUnderscoreDraft } from "@/lib/seo";

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

const HISTORY_SEGMENT = "history";
const DIFF_SEGMENT = "diff";

type HistoryRequest = {
  articleSlug: string[];
  revisionId: string | null;
  /** null = show the revision, "prev" = diff against its predecessor, else a revision id. */
  diffWith: string | null;
};

/**
 * `/pantheon/gods/gozara/history`, `/…/history/<revision>` and
 * `/…/history/<revision>/diff[/<other revision>]` are served by this catch-all
 * rather than their own route: a static `history/` segment cannot sit
 * underneath `[...slug]`.
 *
 * The diff is a path segment rather than a `?diff=` query string on purpose.
 * Reading a query string on the server opts this whole route out of
 * prerendering (Next renders unlisted params in a static context, where
 * searchParams throws DYNAMIC_SERVER_USAGE), and the articles are what we
 * want prerendered.
 */
function readHistoryRequest(slug: string[]): HistoryRequest | null {
  const index = slug.lastIndexOf(HISTORY_SEGMENT);
  // Needs an article in front of it.
  if (index < 1) return null;
  const tail = slug.slice(index + 1);
  if (tail.length > 3) return null;
  const articleSlug = slug.slice(0, index);
  const revisionId = tail[0] ?? null;
  if (!tail[1]) return { articleSlug, revisionId, diffWith: null };
  if (tail[1] !== DIFF_SEGMENT) return null;
  return { articleSlug, revisionId, diffWith: tail[2] ?? "prev" };
}

export function generateStaticParams() {
  return getAllArticleParams();
}

export async function generateMetadata({ params }: NestedSectionPageProps): Promise<Metadata> {
  const { section: sectionSlug, slug } = await params;
  const section = getSectionBySlug(sectionSlug);
  if (!section) return {};

  // Revision pages duplicate article text; a wiki keeps them out of the index.
  const historyRequest = readHistoryRequest(slug);
  if (historyRequest) {
    const target = await getRenderedDocument(section, historyRequest.articleSlug);
    return {
      title: target ? `${target.title} — revision history` : "Revision history",
      robots: { index: false, follow: false },
    };
  }

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
      isNoindexFrontmatter(overviewDocument.frontmatter) ||
        isUnderscoreDraft(overviewDocument.sourcePath),
    );
  }

  const document = await getRenderedDocument(section, slug);
  if (document) {
    const isStub = getDeityCompletion(document.frontmatter)?.isStub ?? false;
    return base(
      document.title,
      cleanDescription(document.summary, section.summary),
      isStub || isNoindexFrontmatter(document.frontmatter) || isUnderscoreDraft(document.sourcePath),
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

  const historyRequest = readHistoryRequest(slug);
  if (historyRequest) {
    return renderHistory({ section, request: historyRequest, searchItems });
  }

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
            dek={getArticleDek(document.frontmatter, document.summary)}
            statusNotice={getArticleStatusNotice(document.frontmatter, section.title)}
            searchItems={searchItems}
            sourceRelativePath={document.sourcePath}
            historyHref={hasHistory(document.sourcePath) ? `${canonicalPath(section.slug, ...slug)}/history` : null}
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

type HistoryViewProps = {
  section: NonNullable<ReturnType<typeof getSectionBySlug>>;
  request: HistoryRequest;
  searchItems: ReturnType<typeof getSearchableArticles>;
};

const REVISION_DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

function formatRevisionDate(iso: string) {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.valueOf()) ? iso : `${REVISION_DATE_FORMAT.format(parsed)} UTC`;
}

/**
 * The revision list, a single old revision, and the diff between two.
 *
 * An old revision is rendered through the live pipeline rather than shown as
 * source, so it reads as the article did at the time; the notice above it is
 * what keeps a reader from mistaking it for current.
 */
async function renderHistory({ section, request, searchItems }: HistoryViewProps) {
  const diffParam = request.diffWith;
  const document = await getRenderedDocument(section, request.articleSlug);
  if (!document) notFound();

  const revisions = getRevisions(document.sourcePath);
  if (!revisions.length) notFound();

  const basePath = canonicalPath(section.slug, ...request.articleSlug);
  const breadcrumbs = [...document.breadcrumb, { title: "History", href: `${basePath}/history` }];

  // --- revision list ---
  if (!request.revisionId) {
    return (
      <main className="min-h-screen px-6 py-12 text-stone-900 lg:px-8">
        <div className="codex-page-inner">
          <ArticleHeader
            breadcrumbs={breadcrumbs}
            label={section.label}
            title={`${document.title}: revision history`}
            dek={`${revisions.length} recorded revision${revisions.length === 1 ? "" : "s"}, newest first.`}
            searchItems={searchItems}
          />
          <section className="mt-10">
            <HistoryList revisions={revisions} basePath={basePath} />
          </section>
          <p className="codex-history-footnote">
            Revisions are recorded when the vault is published. Editing history before{" "}
            {formatRevisionDate(revisions[revisions.length - 1].date)} is not retained.
          </p>
        </div>
        <CornerOrnament position="bottom-right" />
      </main>
    );
  }

  const revision = getRevision(document.sourcePath, request.revisionId);
  if (!revision) notFound();

  // --- diff between two revisions ---
  if (diffParam) {
    const comparison =
      diffParam === "prev"
        ? getRevisionDiff(document.sourcePath, revision.id)
        : compareRevisions(document.sourcePath, diffParam, revision.id);
    if (!comparison) notFound();
    return (
      <main className="min-h-screen px-6 py-12 text-stone-900 lg:px-8">
        <div className="codex-page-inner">
          <ArticleHeader
            breadcrumbs={breadcrumbs}
            label={section.label}
            title={`${document.title}: difference between revisions`}
            dek={`${formatRevisionDate(comparison.from.date)} → ${formatRevisionDate(comparison.to.date)}`}
            searchItems={searchItems}
          />
          <section className="mt-10">
            <HistoryDiff comparison={comparison} />
          </section>
          <p className="codex-history-footnote">
            <Link href={`${basePath}/history`}>Back to revision history</Link>
            {" · "}
            <Link href={basePath}>Current version</Link>
          </p>
        </div>
        <CornerOrnament position="bottom-right" />
      </main>
    );
  }

  // --- one old revision, rendered as the article ---
  const text = getRevisionText(document.sourcePath, revision.id);
  if (text === null) notFound();
  const rendered = await getRenderedRevision(section, request.articleSlug, text);
  if (!rendered) notFound();

  const notice = revision.isCurrent ? (
    <p>
      This is the <strong>current</strong> version of this article.
    </p>
  ) : (
    <p>
      This is an <strong>old revision</strong> of this article, saved on{" "}
      {formatRevisionDate(revision.date)}. It may differ substantially from the{" "}
      <Link href={basePath}>current version</Link>.
    </p>
  );

  return (
    <main className="min-h-screen px-6 py-12 text-stone-900 lg:px-8">
      <div className="codex-page-inner">
        <ArticleHeader
          breadcrumbs={breadcrumbs}
          label={section.label}
          title={rendered.title}
          dek={`Revision ${revision.ordinal} of ${revisions.length} — ${revision.message}`}
          statusNotice={notice}
          searchItems={searchItems}
        />
        <article
          className="codex-entry-body codex-prose mt-10"
          data-article-outline-root="true"
          dangerouslySetInnerHTML={{ __html: demoteLeadingH1(rendered.html) }}
        />
        <p className="codex-history-footnote">
          <Link href={`${basePath}/history`}>Revision history</Link>
          {revision.added === null ? null : (
            <>
              {" · "}
              <Link href={`${basePath}/history/${revision.id}/diff`}>
                Difference from the previous revision
              </Link>
            </>
          )}
          {" · "}
          <Link href={basePath}>Current version</Link>
        </p>
      </div>
      <CornerOrnament position="bottom-right" />
    </main>
  );
}
