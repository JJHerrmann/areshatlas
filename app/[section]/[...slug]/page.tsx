import Link from "next/link";
import { notFound } from "next/navigation";
import CoordinateRule from "@/components/codex/CoordinateRule";
import CornerOrnament from "@/components/codex/CornerOrnament";
import EntryCard from "@/components/codex/EntryCard";
import NationInfobox from "@/components/codex/NationInfobox";
import PlateLabel from "@/components/codex/PlateLabel";
import { getRenderedDocument, getSectionBySlug, getSectionView } from "@/lib/codexContent";

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

  const document = await getRenderedDocument(section, slug);
  if (document) {
    const isNation = document.frontmatter?.type === "nation";
    return (
      <main className="min-h-screen px-6 py-12 text-stone-900 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Link
            href={`/${section.slug}`}
            className="text-xs uppercase tracking-[0.26em] text-amber-800 transition hover:text-amber-950"
          >
            Return to {section.title}
          </Link>

          <nav className="mt-6 flex flex-wrap gap-2 text-xs uppercase tracking-[0.22em] text-amber-800">
            {document.breadcrumb.map((crumb) => (
              <Link
                key={crumb.href}
                href={crumb.href}
                className="border border-amber-400/60 px-3 py-1 transition hover:bg-amber-100/70"
              >
                {crumb.title}
              </Link>
            ))}
          </nav>

          <div className="mt-6 max-w-3xl">
            <PlateLabel>{section.label}</PlateLabel>
            <h1 className="mt-4 font-display text-4xl tracking-tight text-amber-950">
              {document.title}
            </h1>
            <p className="mt-4 text-base leading-7 text-stone-700">{document.summary}</p>
            <CoordinateRule />
          </div>

          {Object.keys(document.frontmatter).length && !isNation ? (
            <dl className="mt-8 grid gap-3 border border-amber-300/80 bg-amber-50/75 p-5 md:grid-cols-2">
              {Object.entries(document.frontmatter).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-[10px] uppercase tracking-[0.22em] text-amber-800">{key}</dt>
                  <dd className="mt-1 text-sm text-stone-800">
                    {Array.isArray(value) ? value.join(", ") : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className={`codex-entry-layout mt-10${isNation ? " with-sidebar" : ""}`}>
            <article
              className="codex-entry-body codex-prose"
              dangerouslySetInnerHTML={{ __html: document.html }}
            />
            {isNation ? <NationInfobox data={{ ...document.frontmatter, title: document.title }} /> : null}
          </div>
        </div>

        <CornerOrnament position="bottom-right" />
      </main>
    );
  }

  const view = getSectionView(section, slug);
  if (!view) notFound();

  return (
    <main className="min-h-screen px-6 py-12 text-stone-900 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.26em] text-amber-800 transition hover:text-amber-950"
        >
          Return to Survey Archive
        </Link>

        <nav className="mt-6 flex flex-wrap gap-2 text-xs uppercase tracking-[0.22em] text-amber-800">
          {view.breadcrumb.map((crumb) => (
            <Link
              key={crumb.href}
              href={crumb.href}
              className="border border-amber-400/60 px-3 py-1 transition hover:bg-amber-100/70"
            >
              {crumb.title}
            </Link>
          ))}
        </nav>

        <div className="mt-6 max-w-3xl">
          <PlateLabel>{section.label}</PlateLabel>
          <h1 className="mt-4 font-display text-4xl tracking-tight text-amber-950">
            {view.breadcrumb[view.breadcrumb.length - 1]?.title ?? section.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-stone-700">
            {view.overview?.summary ?? section.summary}
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.24em] text-amber-700">
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
            <article className="border border-amber-300 bg-amber-50/80 p-6 text-sm leading-6 text-stone-700">
              No immediate entries are present at this level of the codex tree yet.
            </article>
          )}
        </section>
      </div>

      <CornerOrnament position="bottom-right" />
    </main>
  );
}
