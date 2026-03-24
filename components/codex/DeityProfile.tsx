import type { ReactNode } from "react";
import InlineCodexText from "@/components/codex/InlineCodexText";
import SidebarValue from "@/components/codex/SidebarValue";

type DeityProfileProps = {
  frontmatter: Record<string, unknown>;
  sourceRelativePath: string;
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

function renderList(value: unknown, sourceRelativePath: string) {
  if (!Array.isArray(value)) return null;
  const items = value.filter(isFilled);
  if (!items.length) return null;

  return (
    <ul>
      {items.map((item, index) => (
        <li key={`${String(index)}-${typeof item === "string" ? item : "item"}`}>
          <SidebarValue value={item} sourceRelativePath={sourceRelativePath} />
        </li>
      ))}
    </ul>
  );
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

function section(title: string, body: ReactNode | null) {
  if (!body) return null;
  return (
    <section className="mt-10">
      <h2>{title}</h2>
      <div className="mt-4 space-y-4">{body}</div>
    </section>
  );
}

export default function DeityProfile({ frontmatter, sourceRelativePath }: DeityProfileProps) {
  const summary = text(frontmatter.summary) || text(frontmatter.card_summary);
  const title = text(frontmatter.name) || "Deity";
  const epithet = text(frontmatter.epithet);
  const honorific = text(frontmatter.honorific_title);
  const subtitle = [epithet, honorific].filter(Boolean).join(" · ");

  const manifestForms = [
    [text(frontmatter.form_1_name), frontmatter.form_1_description],
    [text(frontmatter.form_2_name), frontmatter.form_2_description],
    [text(frontmatter.form_3_name), frontmatter.form_3_description],
  ].filter(([name, description]) => Boolean(name) && isFilled(description)) as Array<[string, unknown]>;

  const holyDays = Array.isArray(frontmatter.holy_days) ? frontmatter.holy_days.filter(isFilled) : [];

  const tabs = [
    section("Depictions", (
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
    section("Symbols", renderFieldRows(
      [
        ["Primary Symbol", frontmatter.primary_symbol],
        ["Secondary Symbols", frontmatter.secondary_symbols],
        ["Sacred Number", frontmatter.sacred_number],
        ["Sacred Colors", frontmatter.sacred_colors],
        ["Forbidden Colors", frontmatter.forbidden_colors],
        ["Sacred Stones", frontmatter.sacred_stones],
        ["Sacred Objects", frontmatter.sacred_objects],
        ["Sacred Weapons", frontmatter.sacred_weapons],
      ],
      sourceRelativePath,
    )),
    section("Dwelling Place", renderParagraphs(frontmatter.dwelling_place, sourceRelativePath)),
    section("Servants", renderParagraphs(frontmatter.servants_description, sourceRelativePath)),
    section(
      "Worship",
      <>
        {renderFieldRows(
          [
            ["Church Name", frontmatter.church_name],
            ["Central Authority", frontmatter.central_authority],
            ["Regional Titles", frontmatter.regional_titles],
            ["Temple Titles", frontmatter.temple_titles],
            ["Clergy Titles", frontmatter.clergy_titles],
            ["Religious Orders", frontmatter.religious_orders],
            ["Holy Texts", frontmatter.holy_texts],
            ["Apocrypha", frontmatter.apocrypha],
          ],
          sourceRelativePath,
        )}
        {renderParagraphs(frontmatter.doctrine_overview, sourceRelativePath)}
      </>,
    ),
    section(
      "Religious Practices",
      <>
        {renderParagraphs(frontmatter.practices_overview, sourceRelativePath)}
        {holyDays.length ? (
          <div className="codex-frontmatter-panel mt-4 grid gap-3 p-4">
            <div className="grid gap-1">
              <dt className="codex-frontmatter-key">Holy Days</dt>
              <dd className="codex-frontmatter-value">
                <SidebarValue value={holyDays} sourceRelativePath={sourceRelativePath} />
              </dd>
            </div>
          </div>
        ) : null}
        {renderParagraphs(frontmatter.customs_description, sourceRelativePath)}
        {renderParagraphs(frontmatter.taboos_overview, sourceRelativePath)}
        {renderList(frontmatter.taboos, sourceRelativePath)}
      </>,
    ),
    section(
      "Virtues and Vices",
      <>
        {renderFieldRows(
          [
            ["Virtues", frontmatter.virtues],
            ["Vices", frontmatter.vices],
          ],
          sourceRelativePath,
        )}
      </>,
    ),
    section(
      "Mission",
      <>
        {renderParagraphs(frontmatter.theological_mission, sourceRelativePath)}
        {renderParagraphs(frontmatter.social_mission, sourceRelativePath)}
      </>,
    ),
    section("Notes", renderParagraphs(frontmatter.notes, sourceRelativePath)),
  ].filter(Boolean);

  return (
    <article className="codex-entry-body codex-prose">
      <div className="mb-6">
        <div className="codex-kicker">Deity Profile</div>
        <h2 className="codex-page-title mt-2">
          <InlineCodexText text={title} sourceRelativePath={sourceRelativePath} />
        </h2>
        {subtitle ? (
          <p className="codex-page-summary mt-3">
            <InlineCodexText text={subtitle} sourceRelativePath={sourceRelativePath} />
          </p>
        ) : null}
      </div>

      {summary ? (
        <p className="codex-page-summary">
          <InlineCodexText text={summary} sourceRelativePath={sourceRelativePath} />
        </p>
      ) : null}

      {tabs.length ? (
        tabs
      ) : (
        <div className="codex-empty-state mt-6 p-4 text-sm leading-6">
          No structured deity sections have been populated in this record yet.
        </div>
      )}
    </article>
  );
}
