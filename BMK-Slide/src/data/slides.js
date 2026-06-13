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
//    'blank'       — empty canvas (add custom JSX via 'children')
// ─────────────────────────────────────────────────────────────

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
    layout: 'section',
    title: 'Section One',
    subtitle: 'Overview',
  },
  {
    id: 3,
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
    id: 4,
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
    id: 5,
    layout: 'quote',
    quote: 'The best way to predict the future is to create it.',
    author: 'Peter Drucker',
  },
  {
    id: 6,
    layout: 'title',
    title: 'Thank You',
    subtitle: 'Questions?',
  },
]
