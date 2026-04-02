import type { ReactNode } from "react";
import CrossReferenceChips from "@/components/codex/CrossReferenceChips";
import InlineCodexText from "@/components/codex/InlineCodexText";
import RelatedEntitiesCard from "@/components/codex/RelatedEntitiesCard";
import SectionTabNav from "@/components/codex/SectionTabNav";
import SidebarValue from "@/components/codex/SidebarValue";
import {
  getArticlePreviewByHref,
  getDerivedDeityRelations,
  mergeDerivedRelationValues,
  resolveObsidianInlineParts,
} from "@/lib/codexContent";

type DeityProfileProps = {
  frontmatter: Record<string, unknown>;
  sourceRelativePath: string;
  bodyHtml?: string;
};

type DeitySection = {
  title: string;
  body: ReactNode;
};

function isFilled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(isFilled);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).some(isFilled);
  return true;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function renderParagraphs(value: unknown, sourceRelativePath: string) {
  const content = text(value);
  if (!content) return null;

  const paragraphs = content
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  return paragraphs.map((paragraph, index) => (
    <p key={`${paragraph.slice(0, 16)}-${index}`}>
      <SidebarValue value={paragraph} sourceRelativePath={sourceRelativePath} />
    </p>
  ));
}

function renderFieldRows(
  rows: Array<[string, unknown]>,
  sourceRelativePath: string,
): ReactNode | null {
  const filtered = rows.filter(([, value]) => isFilled(value));
  if (!filtered.length) return null;

  return (
    <dl className="codex-frontmatter-panel grid gap-3 p-4">
      {filtered.map(([label, value]) => (
        <div key={label} className="grid gap-1">
          <dt className="codex-frontmatter-key">{label}</dt>
          <dd className="codex-frontmatter-value">
            <SidebarValue value={value} sourceRelativePath={sourceRelativePath} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function toSectionId(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function createSection(title: string, body: ReactNode | null): DeitySection | null {
  return body ? { title, body } : null;
}

function extractBodySegments(bodyHtml?: string) {
  if (!bodyHtml) {
    return {
      leadHtml: "",
      sectionsHtml: "",
      sectionTabs: [] as Array<{ id: string; title: string }>,
    };
  }

  const withoutH1 = bodyHtml.replace(/<h1[\s\S]*?<\/h1>/i, "").trim();
  const firstH2Match = withoutH1.match(/<h2\b[^>]*>/i);
  const splitIndex = firstH2Match?.index ?? -1;
  const leadHtml = splitIndex >= 0 ? withoutH1.slice(0, splitIndex).trim() : withoutH1;
  const sectionsHtml = splitIndex >= 0 ? withoutH1.slice(splitIndex).trim() : "";

  const sectionTabs = Array.from(
    sectionsHtml.matchAll(/<h2\b[^>]*id="([^"]+)"[^>]*data-outline-label="([^"]+)"[^>]*>/gi),
  ).map((match) => ({
    id: match[1],
    title: match[2],
  }));

  return { leadHtml, sectionsHtml, sectionTabs };
}

function linkedItemsFromValue(value: unknown, sourceRelativePath: string) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const seen = new Set<string>();
  const out: Array<{ text: string; href: string }> = [];

  for (const item of values) {
    if (typeof item !== "string") continue;
    for (const part of resolveObsidianInlineParts(item, sourceRelativePath)) {
      if (part.type !== "link" || !part.href) continue;
      const key = `${part.href}|${part.text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ text: part.text, href: part.href });
    }
  }

  return out;
}

export default function DeityProfile({ frontmatter, sourceRelativePath, bodyHtml }: DeityProfileProps) {
  const summary = text(frontmatter.summary) || text(frontmatter.card_summary);
  const { leadHtml, sectionsHtml, sectionTabs } = extractBodySegments(bodyHtml);

  const manifestForms = [
    [text(frontmatter.form_1_name), frontmatter.form_1_description],
    [text(frontmatter.form_2_name), frontmatter.form_2_description],
    [text(frontmatter.form_3_name), frontmatter.form_3_description],
  ].filter(([name, description]) => Boolean(name) && isFilled(description)) as Array<[string, unknown]>;

  const derivedRelations = getDerivedDeityRelations(sourceRelativePath);
  const mergedConsorts = mergeDerivedRelationValues(frontmatter.consorts || frontmatter.consort, derivedRelations.consorts, sourceRelativePath);
  const mergedAllies = mergeDerivedRelationValues(frontmatter.allies, derivedRelations.allies, sourceRelativePath);
  const mergedFoes = mergeDerivedRelationValues(frontmatter.foes, derivedRelations.foes, sourceRelativePath);
  const mergedParents = mergeDerivedRelationValues(frontmatter.parents, derivedRelations.parents, sourceRelativePath);
  const mergedSiblings = mergeDerivedRelationValues(frontmatter.siblings, derivedRelations.siblings, sourceRelativePath);
  const mergedOffspring = mergeDerivedRelationValues(frontmatter.offspring, derivedRelations.offspring, sourceRelativePath);
  const relatedEntityLinks = [
    ...linkedItemsFromValue(mergedParents, sourceRelativePath),
    ...linkedItemsFromValue(mergedSiblings, sourceRelativePath),
    ...linkedItemsFromValue(mergedOffspring, sourceRelativePath),
    ...linkedItemsFromValue(mergedConsorts, sourceRelativePath),
    ...linkedItemsFromValue(mergedAllies, sourceRelativePath),
    ...linkedItemsFromValue(mergedFoes, sourceRelativePath),
    ...linkedItemsFromValue(frontmatter.avatars, sourceRelativePath),
  ].filter((item, index, array) => array.findIndex((candidate) => candidate.href === item.href) === index);
  const relatedEntities = relatedEntityLinks.map((item) => {
    const preview = getArticlePreviewByHref(item.href);
    return {
      text: item.text,
      href: item.href,
      subtitle: preview?.subtitle ?? null,
      imageSrc: preview?.imageSrc,
    };
  });
  const crossReferences = [
    ...linkedItemsFromValue(frontmatter.dwelling_place, sourceRelativePath),
    ...linkedItemsFromValue(frontmatter.religious_orders, sourceRelativePath),
    ...linkedItemsFromValue(frontmatter.holy_texts, sourceRelativePath),
    ...linkedItemsFromValue(frontmatter.apocrypha, sourceRelativePath),
    ...linkedItemsFromValue(frontmatter.major_influence, sourceRelativePath),
    ...linkedItemsFromValue(frontmatter.minor_influences, sourceRelativePath),
    ...linkedItemsFromValue(frontmatter.spheres, sourceRelativePath),
  ].filter((item, index, array) => array.findIndex((candidate) => candidate.href === item.href) === index);

  const sections = [
    createSection("Depictions", (
      <>
        {renderParagraphs(frontmatter.physical_description, sourceRelativePath)}
        {manifestForms.length ? (
          <div className="codex-frontmatter-panel mt-4 grid gap-3 p-4">
            {manifestForms.map(([name, description]) => (
              <div key={name} className="grid gap-1">
                <dt className="codex-frontmatter-key">{name}</dt>
                <dd className="codex-frontmatter-value">
                  <SidebarValue value={description} sourceRelativePath={sourceRelativePath} />
                </dd>
              </div>
            ))}
          </div>
        ) : null}
      </>
    )),
    createSection(
      "Dwelling Place",
      renderParagraphs(frontmatter.dwelling_place_description, sourceRelativePath),
    ),
    createSection("Servants", renderParagraphs(frontmatter.servants_description, sourceRelativePath)),
    createSection("Doctrine", renderParagraphs(frontmatter.doctrine_overview, sourceRelativePath)),
    createSection(
      "Religious Practices",
      <>
        {renderParagraphs(frontmatter.practices_overview, sourceRelativePath)}
        {renderParagraphs(frontmatter.customs_description, sourceRelativePath)}
        {renderParagraphs(frontmatter.taboos_overview, sourceRelativePath)}
      </>,
    ),
    createSection(
      "Mission",
      <>
        {renderParagraphs(frontmatter.theological_mission, sourceRelativePath)}
        {renderParagraphs(frontmatter.social_mission, sourceRelativePath)}
      </>,
    ),
    createSection("Notes", renderParagraphs(frontmatter.notes, sourceRelativePath)),
  ].filter((section): section is DeitySection => Boolean(section));
  const hasStructuredSections = sections.length > 0;
  const hasBodySections = false;

  return (
    <article className="codex-entry-body codex-prose" data-article-outline-root="true">
      {hasBodySections ? (
        <SectionTabNav items={sectionTabs} />
      ) : sections.length ? (
        <SectionTabNav
          items={sections.map((section, index) => {
            const titleText = section.title || `Section ${index + 1}`;
            return {
              id: toSectionId(titleText),
              title: titleText,
            };
          })}
        />
      ) : null}

      {summary ? (
        <p className="codex-page-summary">
          <InlineCodexText text={summary} sourceRelativePath={sourceRelativePath} />
        </p>
      ) : null}

      {!summary && leadHtml ? (
        <div
          className="codex-prose mb-8"
          dangerouslySetInnerHTML={{ __html: leadHtml }}
        />
      ) : null}

      {crossReferences.length ? <CrossReferenceChips items={crossReferences} /> : null}

      {relatedEntities.length ? (
        <div className="codex-support-grid">
          <RelatedEntitiesCard title="Related Deities" items={relatedEntities} />
        </div>
      ) : null}

      {hasBodySections ? (
        <div
          className="codex-prose"
          dangerouslySetInnerHTML={{ __html: sectionsHtml }}
        />
      ) : hasStructuredSections ? (
        sections.map((section) => (
          <section key={section.title} className="mt-12 codex-deity-section">
            <h2
              id={toSectionId(section.title)}
              data-outline-target="true"
              data-outline-level="2"
              data-outline-label={section.title}
              className="codex-deity-section-title"
            >
              {section.title}
            </h2>
            <div className="mt-4 space-y-4">{section.body}</div>
          </section>
        ))
      ) : (
        <div className="codex-empty-state mt-6 p-4 text-sm leading-6">
          No structured deity sections have been populated in this record yet.
        </div>
      )}
    </article>
  );
}
