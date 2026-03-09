type CornerOrnamentProps = {
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
};

export default function CornerOrnament({ position = "bottom-right" }: CornerOrnamentProps) {
  const positionClass = {
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
  }[position];

  return (
    <div className={`pointer-events-none fixed ${positionClass} hidden lg:block`} aria-hidden="true">
      <svg width="96" height="96" viewBox="0 0 96 96" className="text-amber-900/40">
        <path d="M8 88 C8 44, 44 8, 88 8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M20 88 C20 50, 50 20, 88 20" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="88" cy="8" r="2" fill="currentColor" />
        <circle cx="8" cy="88" r="2" fill="currentColor" />
      </svg>
    </div>
  );
}
