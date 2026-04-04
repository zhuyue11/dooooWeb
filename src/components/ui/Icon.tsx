interface IconProps {
  name: string;
  size?: number;
  color?: string;
  weight?: number;
  filled?: boolean;
  className?: string;
}

export function Icon({
  name,
  size = 24,
  color,
  weight = 400,
  filled = false,
  className = '',
}: IconProps) {
  return (
    <span
      className={`material-symbols-rounded ${className}`}
      style={{
        fontSize: size,
        color,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
      }}
    >
      {name}
    </span>
  );
}
