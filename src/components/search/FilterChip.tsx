import { Icon } from '@/components/ui/Icon';

interface FilterChipProps {
  label: string;
  color: string;
  isActive: boolean;
  onClick: () => void;
  icon?: string;
  dotColor?: string;
}

export function FilterChip({ label, color, isActive, onClick, icon, dotColor }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-(--radius-card) border-[1.5px] px-3 py-1.5 text-[13px] font-medium transition-colors"
      style={{
        borderColor: color,
        backgroundColor: isActive ? color : 'transparent',
        color: isActive ? '#fff' : undefined,
      }}
    >
      {dotColor && (
        <span
          className="h-2 w-2 flex-shrink-0 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
      )}
      {icon && (
        <Icon
          name={icon}
          size={14}
          color={isActive ? '#fff' : color}
        />
      )}
      <span className={isActive ? '' : 'text-(--el-page-text)'}>{label}</span>
    </button>
  );
}
