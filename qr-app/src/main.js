import QRCode from 'qrcode'

// ── State ──
let currentSize = 512
let currentEC = 'M'
let currentDark = '#000000'
let currentLight = '#ffffff'
let debounceTimer = null

// ── Elements ──
const urlInput = document.getElementById('urlInput')
const clearBtn = document.getElementById('clearBtn')
const canvas = document.getElementById('qrCanvas')
const placeholder = document.getElementById('placeholder')
const previewArea = document.getElementById('previewArea')
const actions = document.getElementById('actions')
const sizeCustom = document.getElementById('sizeCustom')
const colorDark = document.getElementById('colorDark')
const colorLight = document.getElementById('colorLight')
const themeToggle = document.getElementById('themeToggle')

// ── Theme ──
const saved = localStorage.getItem('qr-theme')
if (saved) document.documentElement.setAttribute('data-theme', saved)

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme')
  const next = current === 'light' ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', next)
  localStorage.setItem('qr-theme', next)
})

// ── Size presets ──
document.querySelectorAll('.size-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    currentSize = parseInt(btn.dataset.size)
    sizeCustom.value = ''
    generate()
  })
})

sizeCustom.addEventListener('input', () => {
  const v = parseInt(sizeCustom.value)
  if (v >= 64 && v <= 2048) {
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'))
    currentSize = v
    generate()
  }
})

// ── Error correction ──
document.querySelectorAll('.ec-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.ec-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    currentEC = btn.dataset.ec
    generate()
  })
})

// ── Colors ──
colorDark.addEventListener('input', () => { currentDark = colorDark.value; generate() })
colorLight.addEventListener('input', () => { currentLight = colorLight.value; generate() })

// ── URL input ──
urlInput.addEventListener('input', () => {
  clearBtn.classList.toggle('visible', urlInput.value.length > 0)
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(generate, 280)
})

clearBtn.addEventListener('click', () => {
  urlInput.value = ''
  clearBtn.classList.remove('visible')
  showPlaceholder()
  urlInput.focus()
})

// ── Generate ──
async function generate() {
  const text = urlInput.value.trim()
  if (!text) { showPlaceholder(); return }

  try {
    await QRCode.toCanvas(canvas, text, {
      width: currentSize,
      margin: 2,
      errorCorrectionLevel: currentEC,
      color: { dark: currentDark, light: currentLight },
    })
    canvas.style.display = 'block'
    placeholder.style.display = 'none'
    previewArea.classList.add('has-qr')
    actions.style.display = 'flex'
  } catch {
    showPlaceholder()
  }
}

function showPlaceholder() {
  canvas.style.display = 'none'
  placeholder.style.display = 'flex'
  previewArea.classList.remove('has-qr')
  actions.style.display = 'none'
}

// ── Download ──
function download(type) {
  const text = urlInput.value.trim()
  if (!text) return

  const offscreen = document.createElement('canvas')
  offscreen.width = currentSize
  offscreen.height = currentSize

  QRCode.toCanvas(offscreen, text, {
    width: currentSize,
    margin: 2,
    errorCorrectionLevel: currentEC,
    color: { dark: currentDark, light: currentLight },
  }, (err) => {
    if (err) return
    const mime = type === 'jpeg' ? 'image/jpeg' : 'image/png'
    const ext  = type === 'jpeg' ? 'jpeg' : 'png'
    const quality = type === 'jpeg' ? 0.95 : undefined

    offscreen.toBlob(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `qr-code.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    }, mime, quality)
  })
}

document.getElementById('downloadPng').addEventListener('click', () => download('png'))
document.getElementById('downloadJpeg').addEventListener('click', () => download('jpeg'))

// ── Copy ──
document.getElementById('copyBtn').addEventListener('click', async () => {
  const text = urlInput.value.trim()
  if (!text || !navigator.clipboard?.write) return

  const offscreen = document.createElement('canvas')
  offscreen.width = currentSize
  offscreen.height = currentSize

  QRCode.toCanvas(offscreen, text, {
    width: currentSize,
    margin: 2,
    errorCorrectionLevel: currentEC,
    color: { dark: currentDark, light: currentLight },
  }, (err) => {
    if (err) return
    offscreen.toBlob(async blob => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        const btn = document.getElementById('copyBtn')
        btn.classList.add('copied')
        btn.querySelector('svg').style.stroke = '#10b981'
        setTimeout(() => {
          btn.classList.remove('copied')
          btn.querySelector('svg').style.stroke = ''
        }, 2000)
      } catch { /* clipboard not permitted */ }
    }, 'image/png')
  })
})

// ── Paste shortcut ──
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'v' && document.activeElement !== urlInput) {
    urlInput.focus()
  }
})
