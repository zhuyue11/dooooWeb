import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import logo from '@/assets/logo-36.svg';

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-surface px-4 lg:hidden">
      <button
        onClick={onMenuToggle}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Icon name="menu" size={20} />
      </button>

      <div className="flex flex-1 items-center gap-2">
        <img src={logo} alt="doooo" className="h-6 w-6" />
        <span className="text-base font-bold text-foreground">DOOOO</span>
      </div>

      <button
        onClick={() => navigate('/notifications')}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Icon name="notifications" size={20} />
      </button>
    </header>
  );
}
