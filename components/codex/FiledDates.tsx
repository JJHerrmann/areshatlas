import type { FiledDate } from "@/lib/codexContent";

type FiledDatesProps = {
  dates?: FiledDate[];
};

/**
 * Dated facts as each bloc's bureau filed them, with the Viennese Post-Exile
 * equivalent struck across in a normalisation stamp. Rendered in the registry
 * rail, beneath the Standing panel.
 */
export default function FiledDates({ dates }: FiledDatesProps) {
  if (!dates?.length) return null;
  return (
    <section className="codex-filed-dates" aria-label="Dates as filed">
      <p className="codex-filed-dates-label">Dates as filed</p>
      {dates.map((d) => (
        <div className="codex-filed-row" key={`${d.label}:${d.filed}`}>
          <span className="codex-filed-key">{d.label}</span>
          <span className="codex-filed">
            <span className="codex-filed-src">{d.filed}</span>
            {d.pe ? <span className="codex-norm-stamp">{d.pe}</span> : null}
          </span>
          {d.reckoning ? <span className="codex-filed-note">{d.reckoning}</span> : null}
        </div>
      ))}
    </section>
  );
}
