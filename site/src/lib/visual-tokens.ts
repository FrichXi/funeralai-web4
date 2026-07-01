export const BRAND_COLORS = {
  purple: '#7351cf',
  purpleLight: '#9b7de8',
  purpleDark: '#5438a0',
  pink: '#f5a0b8',
  pinkDark: '#d97090',
} as const;

export const SEMANTIC_ENTITY_COLORS = {
  company: BRAND_COLORS.purple,
  product: '#10b981',
  person: '#f59e0b',
  vcFirm: '#2dd4bf',
  neutral: '#94a3b8',
} as const;

export const SEMANTIC_RELATION_COLORS = {
  structure: '#60a5fa',
  founding: '#f59e0b',
  investment: '#a78bfa',
  competition: '#ef4444',
  collaboration: '#22d3ee',
  positive: '#34d399',
  critical: '#fb923c',
  neutral: '#94a3b8',
} as const;

export const LEADERBOARD_COLORS = {
  gold: '#facc15',
  goldBright: '#fde047',
  goldSoft: '#fef3c7',
  goldPale: '#fef9c3',
  amber: '#f59e0b',
  amberSoft: '#fde68a',
  purpleSoft: '#e9d5ff',
  purplePale: '#f5e9ff',
  violet: '#c4b5fd',
  violetPale: '#f1ebff',
  slate: '#94a3b8',
} as const;

export const TEST_PAGE_COLORS = {
  paper: '#f5f1e8',
  paperAlt: '#fffaf0',
  paperMuted: '#ebe4d6',
  ink: '#17131d',
  inkSoft: '#2f2938',
  inkMuted: '#5d5368',
  border: '#d7cfbf',
  purple: '#5b3ea7',
} as const;

export const CELESTIAL_THEME_COLORS = {
  night: '#17131d',
  dusk: '#2a1b3d',
  day: TEST_PAGE_COLORS.paper,
  dayWarm: '#f4dca2',
  sun: LEADERBOARD_COLORS.gold,
  moon: '#fff2b8',
  crater: '#e5c873',
} as const;
