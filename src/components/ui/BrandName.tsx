interface StrikethroughOProps {
  className?: string;
}

function StrikethroughO({ className }: StrikethroughOProps) {
  return (
    <span className={`relative inline-block ${className ?? ''}`}>
      o
      <span
        className="absolute left-[20%] top-[54%] w-[60%] border-t-[2px] border-current"
        aria-hidden="true"
      />
    </span>
  );
}

interface BrandNameProps {
  text?: string;
  className?: string;
}

export function BrandName({ text, className }: BrandNameProps) {
  const styledDoooo = (
    <span className={className}>
      D
      <span>o</span>
      <StrikethroughO className="text-(--el-btn-primary-bg)" />
      <StrikethroughO className="text-(--el-btn-primary-bg)" />
      <StrikethroughO className="text-(--el-btn-primary-bg)" />
    </span>
  );

  if (!text) return styledDoooo;

  const parts = text.split('Doooo');
  if (parts.length === 1) return <span className={className}>{text}</span>;

  return (
    <span className={className}>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && styledDoooo}
        </span>
      ))}
    </span>
  );
}
