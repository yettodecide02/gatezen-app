import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';

/**
 * Centralised theme colour hook — replaces the copy-pasted
 * muted / borderCol / cardBg / fieldBg pattern in every screen.
 */
export function useThemeColors() {
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';
  const bg = useThemeColor({}, 'background') as string;
  const text = useThemeColor({}, 'text') as string;
  const tint = useThemeColor({}, 'tint') as string;
  const iconColor = useThemeColor({}, 'icon') as string;

  return {
    theme,
    isDark,
    bg,
    text,
    tint,
    iconColor,
    muted: isDark ? '#94A3B8' : '#64748B',
    borderCol: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    cardBg: isDark ? '#1A1A1A' : '#FFFFFF',
    fieldBg: isDark ? '#111111' : '#F8FAFC',
    btnTextColor: isDark ? '#11181C' : '#ffffff',
  };
}
