type CompassRoseProps = {
  size?: number;
};

export default function CompassRose({ size = 124 }: CompassRoseProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-label="Compass rose"
      role="img"
      className="text-amber-900"
    >
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.7" />
      <path d="M50 6 L56 44 L50 50 L44 44 Z" fill="currentColor" />
      <path d="M94 50 L56 56 L50 50 L56 44 Z" fill="currentColor" opacity="0.65" />
      <path d="M50 94 L44 56 L50 50 L56 56 Z" fill="currentColor" opacity="0.45" />
      <path d="M6 50 L44 44 L50 50 L44 56 Z" fill="currentColor" opacity="0.65" />
      <text x="50" y="14" textAnchor="middle" fontSize="7" fontFamily="serif">N</text>
      <text x="86" y="53" textAnchor="middle" fontSize="7" fontFamily="serif">E</text>
      <text x="50" y="90" textAnchor="middle" fontSize="7" fontFamily="serif">S</text>
      <text x="14" y="53" textAnchor="middle" fontSize="7" fontFamily="serif">W</text>
    </svg>
  );
}
