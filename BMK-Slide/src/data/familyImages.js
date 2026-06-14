const modules = import.meta.glob('../Assets/Family/*', { eager: true, import: 'default' })

const IMAGE_META = {
  '44199804_1985547964857945_6972694244720902144_n.jpg': { w: 2048, h: 1367, featured: true },
  'TripleTrouble.jpg': { w: 1024, h: 2048, col: 1 },
  'DadAndMom.jpg': { w: 1108, h: 1108, col: 1 },
  '505918121_10238124573837934_6429275098397938042_n.jpg': { w: 984, h: 984, col: 2 },
  'IMG_7955.jpg': { w: 1320, h: 1307, col: 2 },
  'LINE_ALBUM_2026 กุ๊กๆ_260614_1.jpg': { w: 1477, h: 1108, col: 2 },
  'LINE_ALBUM_Faifai_September2020_260614_1.jpg': { w: 1478, h: 1108, col: 2 },
}

const COL_ORDER = {
  1: ['TripleTrouble.jpg', 'DadAndMom.jpg'],
  2: [
    '505918121_10238124573837934_6429275098397938042_n.jpg',
    'IMG_7955.jpg',
    'LINE_ALBUM_2026 กุ๊กๆ_260614_1.jpg',
    'LINE_ALBUM_Faifai_September2020_260614_1.jpg',
  ],
}

const byFilename = Object.fromEntries(
  Object.entries(modules).map(([path, src]) => {
    const filename = path.split('/').pop()
    const meta = IMAGE_META[filename] ?? { w: 4, h: 3 }
    return [filename, {
      src,
      filename,
      alt: filename.replace(/\.[^.]+$/, '').replace(/_/g, ' '),
      w: meta.w,
      h: meta.h,
      featured: !!meta.featured,
      col: meta.col ?? null,
    }]
  }),
)

export const familyImages = Object.values(byFilename)

export const familyFeatured = familyImages.find((img) => img.featured)

export const familyColumns = [1, 2].map((col) =>
  COL_ORDER[col].map((filename) => byFilename[filename]).filter(Boolean),
)
