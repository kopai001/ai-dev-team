// ─────────────────────────────────────────────────────────────
//  SLIDE DATA — edit this file to build your presentation
//
//  Available layouts:
//    'title'       — big title + subtitle (opening slide)
//    'section'     — section divider with accent background
//    'content'     — title + bullet points
//    'two-column'  — title + left/right columns
//    'quote'       — large pull quote + author
//    'image'       — full-bleed image + optional caption
//    'profile'     — self-introduction card
//    'gallery'     — eyebrow + title + photo grid
//    'blank'       — empty canvas (add custom JSX via 'children')
// ─────────────────────────────────────────────────────────────

import { familyFeatured, familyColumns } from './familyImages'

export const slides = [
  {
    id: 1,
    layout: 'title',
    title: 'BMK Presentation',
    subtitle: 'Your subtitle goes here',
    badge: '',           // optional small badge above title
  },
  {
    id: 2,
    layout: 'profile',
    eyebrow: 'แนะนำตัว',
    nameTh: 'สาธิน ปึงพิพัฒน์ตระกูล',
    nameEn: 'Sathin Pungpipattrakul',
    nickname: 'กอไผ่',
    birthYear: 1996,
    birthMonth: 2,
    birthDay: 8,
    email: 'kopai.bmk@gmail.com',
    phone: '087-398-5100',
    line: 'kopaisathin',
    location: 'สงขลา หาดใหญ่',
  },
  {
    id: 3,
    layout: 'gallery',
    eyebrow: 'แนะนำตัว',
    title: 'ครอบครัว',
    featured: familyFeatured,
    columns: familyColumns,
  },
  {
    id: 4,
    layout: 'content',
    title: 'Key Points',
    bullets: [
      'First key point goes here',
      'Second key point goes here',
      'Third key point goes here',
      'Fourth key point goes here',
    ],
  },
  {
    id: 5,
    layout: 'two-column',
    title: 'Side by Side',
    left: {
      heading: 'Before',
      bullets: ['Manual process', 'Slow feedback', 'High error rate'],
    },
    right: {
      heading: 'After',
      bullets: ['Automated flow', 'Real-time data', 'Near-zero errors'],
    },
  },
  {
    id: 6,
    layout: 'quote',
    quote: 'The best way to predict the future is to create it.',
    author: 'Peter Drucker',
  },
  {
    id: 7,
    layout: 'title',
    title: 'Thank You',
    subtitle: 'Questions?',
  },
]
