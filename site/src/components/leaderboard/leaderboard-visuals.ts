import type {
  SponsorIconVariant,
  SponsorThemeVariant,
} from '@/lib/types';
import { LEADERBOARD_COLORS } from '@/lib/visual-tokens';

export const PIXEL_ICON_SPECS: Record<
  SponsorIconVariant,
  {
    width: number;
    height: number;
    pixelSize: number;
    color: string;
    glow: string;
    pixels: Array<[number, number]>;
  }
> = {
  'supreme-crown': {
    width: 7,
    height: 4,
    pixelSize: 3,
    color: LEADERBOARD_COLORS.goldBright,
    glow: 'rgba(253, 224, 71, 0.7)',
    pixels: [
      [0, 1], [1, 0], [2, 1], [3, 0], [4, 1], [5, 0], [6, 1],
      [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2],
      [1, 3], [2, 3], [3, 3], [4, 3], [5, 3],
    ],
  },
  gem: {
    width: 5,
    height: 5,
    pixelSize: 3,
    color: LEADERBOARD_COLORS.gold,
    glow: 'rgba(250, 204, 21, 0.65)',
    pixels: [
      [2, 0],
      [1, 1], [2, 1], [3, 1],
      [0, 2], [1, 2], [2, 2], [3, 2], [4, 2],
      [1, 3], [2, 3], [3, 3],
      [2, 4],
    ],
  },
  'triple-crown': {
    width: 7,
    height: 3,
    pixelSize: 3,
    color: LEADERBOARD_COLORS.amber,
    glow: 'rgba(245, 158, 11, 0.5)',
    pixels: [
      [1, 0], [3, 1], [5, 0],
      [0, 1], [1, 1], [2, 1], [4, 1], [5, 1], [6, 1],
      [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2],
    ],
  },
  'legacy-primary': {
    width: 7,
    height: 3,
    pixelSize: 3,
    color: LEADERBOARD_COLORS.purpleSoft,
    glow: 'rgba(168, 85, 247, 0.45)',
    pixels: [
      [0, 0], [3, 1], [6, 0],
      [0, 1], [1, 1], [2, 1], [4, 1], [5, 1], [6, 1],
      [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2],
    ],
  },
  'legacy-secondary': {
    width: 7,
    height: 4,
    pixelSize: 3,
    color: LEADERBOARD_COLORS.violet,
    glow: 'rgba(139, 92, 246, 0.4)',
    pixels: [
      [1, 0], [5, 0],
      [0, 1], [1, 1], [3, 1], [5, 1], [6, 1],
      [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2],
      [1, 3], [2, 3], [3, 3], [4, 3], [5, 3],
    ],
  },
  'double-crown': {
    width: 5,
    height: 2,
    pixelSize: 3,
    color: '#9b7de8',
    glow: 'rgba(155, 125, 232, 0.45)',
    pixels: [
      [0, 0], [2, 0], [4, 0],
      [0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
    ],
  },
  'single-crown': {
    width: 5,
    height: 3,
    pixelSize: 3,
    color: LEADERBOARD_COLORS.slate,
    glow: 'rgba(148, 163, 184, 0.35)',
    pixels: [
      [2, 0],
      [1, 1], [2, 1], [3, 1],
      [0, 2], [1, 2], [2, 2], [3, 2], [4, 2],
    ],
  },
};

export const SPONSOR_THEME_STYLES: Record<
  SponsorThemeVariant,
  {
    rowClass: string;
    titleClass: string;
    nameClass: string;
    karmaClass: string;
    badgeClass: string;
    trailingTextClass: string;
  }
> = {
  'supreme-gold': {
    rowClass: '!border-[#fde047]/90 !bg-[#fde047]/12 hover:!bg-[#fde047]/22',
    titleClass: 'text-[#fde047]',
    nameClass: 'text-[#fef9c3]',
    karmaClass: 'text-[#fde047]',
    badgeClass: 'border-[#fde047]/80 bg-[#fde047]/20 text-[#fef9c3]',
    trailingTextClass: 'text-[#fef9c3]',
  },
  'top-gold': {
    rowClass: '!border-[#facc15]/80 !bg-[#facc15]/10 hover:!bg-[#facc15]/20',
    titleClass: 'text-[#facc15]',
    nameClass: 'text-[#fef3c7]',
    karmaClass: 'text-[#facc15]',
    badgeClass: 'border-[#facc15]/80 bg-[#facc15]/20 text-[#fef3c7]',
    trailingTextClass: 'text-[#fef3c7]',
  },
  'high-gold': {
    rowClass: '!border-[#f59e0b]/60 !bg-[#f59e0b]/10 hover:!bg-[#f59e0b]/20',
    titleClass: 'text-[#fbbf24]',
    nameClass: 'text-[#fde68a]',
    karmaClass: 'text-[#fbbf24]',
    badgeClass: 'border-[#f59e0b]/60 bg-[#f59e0b]/20 text-[#fde68a]',
    trailingTextClass: 'text-[#fde68a]',
  },
  'legacy-primary': {
    rowClass: '!border-[#9b7de8]/60 !bg-[#7351cf]/10 hover:!bg-[#7351cf]/20',
    titleClass: 'text-[#9b7de8]',
    nameClass: 'text-[#f5e9ff]',
    karmaClass: 'text-[#e9d5ff]',
    badgeClass: 'border-[#9b7de8]/60 bg-[#7351cf]/20 text-[#f5e9ff]',
    trailingTextClass: 'text-[#f5e9ff]',
  },
  'legacy-secondary': {
    rowClass: '!border-[#c4b5fd]/50 !bg-[#6d5aa8]/10 hover:!bg-[#6d5aa8]/20',
    titleClass: 'text-[#c4b5fd]',
    nameClass: 'text-[#f1ebff]',
    karmaClass: 'text-[#ddd6fe]',
    badgeClass: 'border-[#c4b5fd]/60 bg-[#6d5aa8]/20 text-[#f1ebff]',
    trailingTextClass: 'text-[#f1ebff]',
  },
  guardian: {
    rowClass: '',
    titleClass: 'text-primary',
    nameClass: 'text-foreground',
    karmaClass: 'text-[#facc15]',
    badgeClass: 'border-border/40 bg-transparent text-transparent',
    trailingTextClass: 'text-foreground',
  },
  supporter: {
    rowClass: '',
    titleClass: 'text-muted-foreground',
    nameClass: 'text-foreground',
    karmaClass: 'text-[#facc15]',
    badgeClass: 'border-border/40 bg-transparent text-transparent',
    trailingTextClass: 'text-muted-foreground',
  },
};

export const MOBILE_SPONSOR_TITLE_LABELS: Record<string, string> = {
  '葬爱Web4万古至尊金主': '万古至尊',
  '葬爱Web4至高无上功德主': '至高无上',
  '葬爱Web4无上功德主': '无上功德',
  '葬爱Web4大功德主': '大功德',
  '葬爱Web4护法金主': '护法',
  '葬爱Web4随喜功德主': '随喜',
};
