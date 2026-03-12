type NationInfoboxProps = {
  data: Record<string, unknown>;
};

function renderValue(value: unknown) {
  if (Array.isArray(value)) {
    return (
      <ul>
        {value.map((item, index) => (
          <li key={`${String(item)}-${index}`}>{String(item)}</li>
        ))}
      </ul>
    );
  }
  return value ? String(value) : null;
}

export default function NationInfobox({ data }: NationInfoboxProps) {
  const candidateRows: Array<[string, unknown]> = [
    ["Endonym", data.endonym] as [string, unknown],
    ["Exonym", data.exonym] as [string, unknown],
    ["English Gloss", data.english_gloss] as [string, unknown],
    ["State Form", data.state_form] as [string, unknown],
    ["Capital", data.capital] as [string, unknown],
    ["Ruler", data.ruler] as [string, unknown],
    ["People", data.people] as [string, unknown],
    ["Language", data.language] as [string, unknown],
    ["Mountain Range", data.range] as [string, unknown],
    ["Sacred Peak", data.sacred_peak] as [string, unknown],
    ["Religion", data.religion] as [string, unknown],
    ["Exports", data.exports] as [string, unknown],
  ];
  const rows = candidateRows.filter(([, value]) => Boolean(value));

  if (!rows.length) return null;

  return (
    <aside className="codex-infobox">
      <div className="codex-infobox-title">{String(data.title || data.endonym || "Nation")}</div>
      <dl className="codex-infobox-grid">
        {rows.map(([label, value]) => (
          <div key={label} className="codex-infobox-row">
            <dt>{label}</dt>
            <dd>{renderValue(value)}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
