type ProvenanceProps = {
  /** Pre-rendered HTML for the "how this doc was built" colophon, or undefined. */
  html?: string;
};

/**
 * Renders a document's provenance / "how this doc was built" note as a quiet
 * colophon at the foot of the page, rather than a banner above the content.
 */
export default function Provenance({ html }: ProvenanceProps) {
  if (!html) return null;
  return (
    <footer className="codex-provenance" aria-label="How this document was built">
      <p className="codex-provenance-label">How this document was built</p>
      <div className="codex-provenance-body" dangerouslySetInnerHTML={{ __html: html }} />
    </footer>
  );
}
