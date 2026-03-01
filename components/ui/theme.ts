import { ColorSchemeName, Platform } from 'react-native';

export type AppTheme = {
  background: string;
  backgroundMuted: string;
  surface: string;
  surfaceStrong: string;
  surfaceInverted: string;
  text: string;
  textMuted: string;
  textSoft: string;
  accent: string;
  accentDeep: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  border: string;
  borderStrong: string;
  shadow: string;
  tabGlass: string;
  haloPrimary: string;
  haloSecondary: string;
  haloTertiary: string;
};

const darkTheme: AppTheme = {
  background: '#000000',
  backgroundMuted: '#3D0000',
  surface: '#000000',
  surfaceStrong: '#3D0000',
  surfaceInverted: '#950101',
  text: '#FFFFFF',
  textMuted: '#E3CCCC',
  textSoft: '#B88D8D',
  accent: '#950101',
  accentDeep: '#FF0000',
  accentSoft: 'rgba(255, 0, 0, 0.16)',
  success: '#950101',
  successSoft: 'rgba(149, 1, 1, 0.22)',
  warning: '#950101',
  warningSoft: 'rgba(149, 1, 1, 0.22)',
  danger: '#FF0000',
  dangerSoft: 'rgba(255, 0, 0, 0.18)',
  border: '#3D0000',
  borderStrong: '#950101',
  shadow: 'rgba(0, 0, 0, 0.55)',
  tabGlass: '#000000',
  haloPrimary: 'transparent',
  haloSecondary: 'transparent',
  haloTertiary: 'transparent',
};

export const fonts = {
  display: Platform.select({
    ios: 'AvenirNextCondensed-DemiBold',
    android: 'sans-serif-condensed',
    default: 'Georgia',
  }),
  body: Platform.select({
    ios: 'AvenirNext-Regular',
    android: 'sans-serif-medium',
    default: 'Trebuchet MS',
  }),
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'Courier New',
  }),
};

export function getTheme(_colorScheme: ColorSchemeName): AppTheme {
  return darkTheme;
}

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
};

export const elevations = {
  card: {
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
};
