import { useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function ImageLightbox({ images, index, onClose, onChangeIndex }) {
  const image = images[index]
  const hasMultiple = images.length > 1

  const goPrev = useCallback(() => {
    onChangeIndex((index - 1 + images.length) % images.length)
  }, [index, images.length, onChangeIndex])

  const goNext = useCallback(() => {
    onChangeIndex((index + 1) % images.length)
  }, [index, images.length, onChangeIndex])

  useEffect(() => {
    const onKey = (e) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          e.stopImmediatePropagation()
          onClose()
          break
        case 'ArrowLeft':
          if (!hasMultiple) return
          e.preventDefault()
          e.stopImmediatePropagation()
          goPrev()
          break
        case 'ArrowRight':
          if (!hasMultiple) return
          e.preventDefault()
          e.stopImmediatePropagation()
          goNext()
          break
        case ' ':
        case 'PageDown':
        case 'PageUp':
          e.preventDefault()
          e.stopImmediatePropagation()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKey, true)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = prevOverflow
    }
  }, [goNext, goPrev, hasMultiple, onClose])

  if (!image) return null

  return createPortal(
    <div
      className="gallery-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={image.alt}
    >
      <button
        type="button"
        className="gallery-lightbox-backdrop"
        onClick={onClose}
        aria-label="ปิด"
      />

      <div className="gallery-lightbox-panel">
        <button
          type="button"
          className="gallery-lightbox-close"
          onClick={onClose}
          aria-label="ปิด"
        >
          ×
        </button>

        {hasMultiple && (
          <>
            <button
              type="button"
              className="gallery-lightbox-nav gallery-lightbox-nav--prev"
              onClick={goPrev}
              aria-label="รูปก่อนหน้า"
            >
              ‹
            </button>
            <button
              type="button"
              className="gallery-lightbox-nav gallery-lightbox-nav--next"
              onClick={goNext}
              aria-label="รูปถัดไป"
            >
              ›
            </button>
          </>
        )}

        <img
          src={image.src}
          alt={image.alt}
          className="gallery-lightbox-img"
        />

        <div className="gallery-lightbox-meta">
          <p className="gallery-lightbox-caption">{image.alt}</p>
          {hasMultiple && (
            <span className="gallery-lightbox-counter">
              {index + 1} / {images.length}
            </span>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
