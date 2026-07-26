import { useTheme } from '../../context/ThemeContext';
import Button from './Button';

export default function ThemeToggle({ size = 'sm', className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Button
      type="button"
      variant="secondary"
      size={size}
      className={className}
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? 'Light' : 'Dark'}
    </Button>
  );
}
