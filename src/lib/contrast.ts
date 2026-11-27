// WCAG 2.1 contrast ratio between two sRGB hex colours.
function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!);
}

export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1! + 0.05) / (l2! + 0.05);
}

/**
 * Text/background pairs the design uses, with the minimum they must reach
 * (4.5 for body text, 3 for text 24 px and larger or bold 18.66 px and larger).
 */
export const textPairs: { fg: string; bg: string; use: string; min: number }[] = [
  { fg: '#14201F', bg: '#E7F1EE', use: 'ink on page background', min: 4.5 },
  { fg: '#3B4A48', bg: '#FFFFFF', use: 'body text on cards', min: 4.5 },
  { fg: '#566664', bg: '#FFFFFF', use: 'muted text on cards', min: 4.5 },
  { fg: '#566664', bg: '#E7F1EE', use: 'muted text on page background', min: 4.5 },
  { fg: '#566664', bg: '#F2F8F6', use: 'muted text on subtle panels', min: 4.5 },
  { fg: '#00756A', bg: '#FFFFFF', use: 'links on cards', min: 4.5 },
  { fg: '#00756A', bg: '#E7F1EE', use: 'links on page background', min: 4.5 },
  { fg: '#00756A', bg: '#F2F8F6', use: 'links on subtle panels', min: 4.5 },
  { fg: '#123B39', bg: '#D3EAE4', use: 'text on chips and theme tags', min: 4.5 },
  { fg: '#FFFFFF', bg: '#1F4A47', use: 'white on teal band, venue labels', min: 4.5 },
  { fg: '#E9F3F0', bg: '#1F4A47', use: 'on-dark text', min: 4.5 },
  { fg: '#CFE3DE', bg: '#1F4A47', use: 'hero lead text', min: 4.5 },
  { fg: '#BFD9D3', bg: '#1F4A47', use: 'footer text, breadcrumbs', min: 4.5 },
  { fg: '#BFD9D3', bg: '#18403D', use: 'field caption on hero panel', min: 4.5 },
  { fg: '#F3B585', bg: '#1F4A47', use: 'small peach text on dark teal', min: 4.5 },
  { fg: '#E38A43', bg: '#1F4A47', use: 'rolling word (62 px display)', min: 3 },
  { fg: '#1A1208', bg: '#E38A43', use: 'text on orange buttons and awards', min: 4.5 },
  { fg: '#3A2410', bg: '#FCE7D4', use: 'join band heading', min: 4.5 },
  { fg: '#5A3A1C', bg: '#FCE7D4', use: 'join band text', min: 4.5 },
  { fg: '#9A4A0C', bg: '#FDEEE1', use: 'orange ink on peach boxes', min: 4.5 },
  { fg: '#6E8783', bg: '#E7F1EE', use: 'year rail (28-32 px display)', min: 3 },
  { fg: '#008878', bg: '#E7F1EE', use: 'accent labels (large)', min: 3 },
];
