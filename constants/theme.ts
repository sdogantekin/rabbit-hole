// Design tokens from the Claude Design canvas (RabbitHole.dc.html). React Native has no
// oklch() support, so every color is computed once at module load via a real OKLCh->sRGB
// conversion (Björn Ottosson's OKLab matrices) rather than eyeballed to a hex approximation.
function oklch(lPercent: number, c: number, hDeg: number): string {
  const L = lPercent / 100;
  const hRad = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const rLin = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const toSrgb = (c: number) => {
    const clamped = Math.min(1, Math.max(0, c));
    const gammaCorrected = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, gammaCorrected)) * 255);
  };

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(toSrgb(rLin))}${toHex(toSrgb(gLin))}${toHex(toSrgb(bLin))}`;
}

export const colors = {
  appBackground: oklch(97, 0.012, 60),
  surface: '#ffffff',
  surfaceMuted: oklch(98, 0.008, 60),

  ink: oklch(22, 0.01, 60),
  inkSecondary: oklch(45, 0.01, 60),
  inkMuted: oklch(55, 0.01, 60),
  inkFaint: oklch(60, 0.01, 60),

  border: oklch(90, 0.01, 60),
  borderStrong: oklch(80, 0.01, 60),
  neutralWash: oklch(94, 0.01, 60),
  neutralWashStrong: oklch(92, 0.01, 60),

  accent: oklch(55, 0.13, 150), // brand green — like button, streak dot, positive states
  accentStrong: oklch(45, 0.13, 150),
  negative: oklch(50, 0.16, 25), // skip / pass
  negativeBorder: oklch(58, 0.16, 25),

  badgeEarnedBg: oklch(90, 0.05, 150),
  badgeEarnedDot: oklch(50, 0.13, 150),
  badgeUnearnedBg: oklch(93, 0.005, 60),
  badgeUnearnedDot: oklch(80, 0.005, 60),
} as const;

export const fonts = {
  serif: 'SourceSerif4_600SemiBold',
  serifRegular: 'SourceSerif4_400Regular',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
} as const;

// Same hue-spread formula as the design canvas (accentColor/tintColor), applied to our real
// 10 curated categories rather than the mockup's placeholder list.
export function categoryAccent(hueDeg: number): string {
  return oklch(58, 0.11, hueDeg);
}

export function categoryTint(hueDeg: number): string {
  return oklch(93, 0.03, hueDeg);
}
