import Link from "next/link";
import { notFound } from "next/navigation";
import CoordinateRule from "@/components/codex/CoordinateRule";
import CornerOrnament from "@/components/codex/CornerOrnament";
import DeityInfobox from "@/components/codex/DeityInfobox";
import EntryCard from "@/components/codex/EntryCard";
import NationInfobox from "@/components/codex/NationInfobox";
import PlateLabel from "@/components/codex/PlateLabel";
import { getDeitySidebar, getNationSidebar, getRenderedDocument, getRenderedOverviewDocument, getSectionBySlug, getSectionView } from "@/lib/codexContent";

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

  const view = getSectionView(section, slug);
  const overviewDocument = view ? await getRenderedOverviewDocument(section, slug) : null;
  if (view && overviewDocument) {
    return (
      <main className="min-h-screen px-6 py-12 text-stone-900 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Link href="/" className="codex-backlink">
            Return to Survey Archive
          </Link>

          <nav className="mt-6 flex flex-wrap gap-2">
            {overviewDocument.breadcrumb.map((crumb) => (
              <Link key={crumb.href} href={crumb.href} className="codex-breadcrumb-pill">
                {crumb.title}
              </Link>
            ))}
          </nav>

          <div className="mt-6 max-w-3xl">
            <PlateLabel>{section.label}</PlateLabel>
            <h1 className="codex-page-title mt-4">{overviewDocument.title}</h1>
            <p className="codex-page-summary mt-4">{overviewDocument.summary}</p>
            <CoordinateRule />
          </div>

          {Object.keys(overviewDocument.frontmatter).length ? (
            <dl className="codex-frontmatter-panel mt-8 grid gap-3 p-5 md:grid-cols-2">
              {Object.entries(overviewDocument.frontmatter).map(([key, value]) => (
                <div key={key}>
                  <dt className="codex-frontmatter-key">{key}</dt>
                  <dd className="codex-frontmatter-value mt-1 text-sm">
                    {Array.isArray(value) ? value.join(", ") : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          <article
            className="codex-entry-body codex-prose mt-10"
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

  const document = await getRenderedDocument(section, slug);
  if (document) {
    const nationSidebar = getNationSidebar(document.sourcePath);
    const deitySidebar = getDeitySidebar(document.sourcePath);
    const hasSidebar = Boolean(nationSidebar) || Boolean(deitySidebar);
    const isNation = Boolean(nationSidebar) || document.frontmatter?.type === "nation";
    return (
      <main className="min-h-screen px-6 py-12 text-stone-900 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Link href={`/${section.slug}`} className="codex-backlink">
            Return to {section.title}
          </Link>

          <nav className="mt-6 flex flex-wrap gap-2">
            {document.breadcrumb.map((crumb) => (
              <Link key={crumb.href} href={crumb.href} className="codex-breadcrumb-pill">
                {crumb.title}
              </Link>
            ))}
          </nav>

          <div className="mt-6 max-w-3xl">
            <PlateLabel>{section.label}</PlateLabel>
            <h1 className="codex-page-title mt-4">{document.title}</h1>
            <p className="codex-page-summary mt-4">{document.summary}</p>
            <CoordinateRule />
          </div>

          {Object.keys(document.frontmatter).length && !hasSidebar ? (
            <dl className="codex-frontmatter-panel mt-8 grid gap-3 p-5 md:grid-cols-2">
              {Object.entries(document.frontmatter).map(([key, value]) => (
                <div key={key}>
                  <dt className="codex-frontmatter-key">{key}</dt>
                  <dd className="codex-frontmatter-value mt-1 text-sm">
                    {Array.isArray(value) ? value.join(", ") : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className={`codex-entry-layout mt-10${hasSidebar ? " with-sidebar" : ""}`}>
            <article
              className="codex-entry-body codex-prose"
              dangerouslySetInnerHTML={{ __html: document.html }}
            />
            {nationSidebar ? <NationInfobox data={nationSidebar} /> : null}
            {deitySidebar ? <DeityInfobox data={deitySidebar} /> : null}
          </div>
        </div>

        <CornerOrnament position="bottom-right" />
      </main>
    );
  }

  if (!view) notFound();

  return (
    <main className="min-h-screen px-6 py-12 text-stone-900 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="codex-backlink">
          Return to Survey Archive
        </Link>

        <nav className="mt-6 flex flex-wrap gap-2">
          {view.breadcrumb.map((crumb) => (
            <Link key={crumb.href} href={crumb.href} className="codex-breadcrumb-pill">
              {crumb.title}
            </Link>
          ))}
        </nav>

        <div className="mt-6 max-w-3xl">
          <PlateLabel>{section.label}</PlateLabel>
          <h1 className="codex-page-title mt-4">{view.breadcrumb[view.breadcrumb.length - 1]?.title ?? section.title}</h1>
          <p className="codex-page-summary mt-4">
            {view.overview?.summary ?? section.summary}
          </p>
          <p className="codex-source-note mt-3">
            Mirrored Source Folder: {view.sourcePath}
          </p>
          <CoordinateRule />
        </div>

        <section className="mt-10">
          {view.entries.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {view.entries.map((entry) => (
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
              No immediate entries are present at this level of the codex tree yet.
            </article>
          )}
        </section>
      </div>

      <CornerOrnament position="bottom-right" />
    </main>
  );
}
