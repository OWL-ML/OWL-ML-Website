export interface NavItem {
  id: string;
  label: string;
  href: string;
}

/** Main navigation, in display order. `id` is what pages pass as `current`. */
export const nav: NavItem[] = [
  { id: 'research', label: 'Research', href: '/#research' },
  { id: 'people', label: 'People', href: '/people/' },
  { id: 'publications', label: 'Publications', href: '/publications/' },
  { id: 'teaching', label: 'Teaching', href: '/teaching/' },
  { id: 'theses', label: 'Theses', href: '/theses/' },
  { id: 'news', label: 'News', href: '/news/' },
];
