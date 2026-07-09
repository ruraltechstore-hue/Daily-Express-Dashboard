// ─── Design Tokens ───────────────────────────────────────────────
// Matches the Daily Express dairy brand identity.
// All values sync with CSS custom properties in index.css.

export const colors = {
  primary: '#111111',
  secondary: '#F6E7A9',
  accent: '#DDF3E5',
  background: '#FFFFFF',
  surface: '#FAFAFA',
  border: '#ECECEC',
  success: '#43A047',
  warning: '#FFB300',
  error: '#E53935',

  // Text
  textPrimary: '#111111',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Derived
  primaryHover: '#2A2A2A',
  secondaryHover: '#F0DC8A',
  surfaceHover: '#F5F5F5',
  borderFocus: '#111111',
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
} as const;

export const radii = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
  md: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
  lg: '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.03)',
  xl: '0 10px 15px -3px rgba(0, 0, 0, 0.04), 0 4px 6px -4px rgba(0, 0, 0, 0.02)',
} as const;

export const typography = {
  fontFamily: "'Poppins', sans-serif",
  sizes: {
    xs: '0.75rem',     // 12px
    sm: '0.8125rem',   // 13px
    base: '0.875rem',  // 14px
    md: '1rem',        // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
  },
  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

// ─── Chart Colors ────────────────────────────────────────────────
export const chartColors = {
  primary: '#111111',
  secondary: '#F6E7A9',
  accent: '#DDF3E5',
  success: '#43A047',
  warning: '#FFB300',
  error: '#E53935',
  gray: '#9CA3AF',
} as const;
