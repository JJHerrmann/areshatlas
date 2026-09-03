import Link from "next/link";

type EntryCardProps = {
  title: string;
  domain: string;
  summary: string;
  imageSrc?: string;
  href?: string;
  kind?: "folder" | "file";
  meta?: string;
};

const SUMMARY_LIMIT = 220;

function clampSummary(summary: string) {
  const clean = summary.replace(/\s+/g, " ").trim();
  if (clean.length <= SUMMARY_LIMIT) return clean;
  const cut = clean.slice(0, SUMMARY_LIMIT);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 120 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:\s]+$/, "")}…`;
}

function renderInlineSummary(summary: string) {
  const parts = summary.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={`strong-${index}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={`em-${index}`}>{part.slice(1, -1)}</em>;
    }
    return <span key={`text-${index}`}>{part}</span>;
  });
}

export default function EntryCard({ title, domain, summary, imageSrc, href, kind = "file", meta }: EntryCardProps) {
  const body = (
    <article
      className="relative overflow-hidden border border-stone-300 bg-amber-50/70 p-4"
      style={{
        backgroundImage: imageSrc
          ? `linear-gradient(rgba(252, 247, 236, 0.82), rgba(245, 235, 214, 0.82)), url("${imageSrc}")`
          : undefined,
        backgroundSize: imageSrc ? "cover" : undefined,
        backgroundPosition: imageSrc ? "center" : undefined,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(120,93,50,0.06) 100%)",
          opacity: imageSrc ? 1 : 0,
        }}
      />
      <p className="relative text-[10px] uppercase tracking-[0.2em] text-stone-600">
        {kind === "folder" ? "Survey Division" : "Recorded Entry"} | {domain}
      </p>
      <h4 className="relative mt-2 font-display text-lg text-stone-900">{title}</h4>
      {meta ? (
        <p className="relative mt-1 text-[11px] uppercase tracking-[0.14em] text-amber-800/80">{meta}</p>
      ) : null}
      <p className="relative mt-2 text-sm leading-6 text-stone-800/85">
        {renderInlineSummary(clampSummary(summary))}
      </p>
    </article>
  );

  if (!href) {
    return body;
  }

  return (
    <Link href={href} className="block transition hover:border-amber-500/70 hover:bg-amber-50/90">
      {body}
    </Link>
  );
}
