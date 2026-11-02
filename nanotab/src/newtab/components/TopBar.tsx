import { Moon, Settings, Sun } from 'lucide-react';

interface Props {
  dark: boolean;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

export function TopBar({ dark, onToggleTheme, onOpenSettings }: Props) {
  return (
    <div className="topbar">
      <button
        className="icon-btn"
        onClick={onToggleTheme}
        aria-label={dark ? '关闭黑暗模式' : '开启黑暗模式'}
      >
        {dark ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      <button className="icon-btn" onClick={onOpenSettings} aria-label="设置">
        <Settings size={20} />
      </button>
    </div>
  );
}
