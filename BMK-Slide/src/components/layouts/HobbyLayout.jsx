import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import './layouts.css'

function ImageLightbox({ images, index, onClose, onChangeIndex }) {
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
    <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={image.alt}>
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
        <img src={image.src} alt={image.alt} className="gallery-lightbox-img" />
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

export default function HobbyLayout({ slide }) {
  const images = slide.images ?? []
  const [lightboxIndex, setLightboxIndex] = useState(null)

  const openLightbox = useCallback(
    (index) => setLightboxIndex(index),
    [],
  )

  const closeLightbox = useCallback(() => setLightboxIndex(null), [])

  return (
    <div className="slide slide--hobby">
      <div className="hobby-layout">
        <div className="hobby-left">
          <div className="hobby-grid" role="list" aria-label="รูปงานอดิเรก">
            {images.map((img, i) => (
              <figure
                key={img.src}
                className="hobby-grid-item gallery-item gallery-item--interactive"
                role="listitem"
              >
                <button
                  type="button"
                  className="gallery-item-btn"
                  onClick={() => openLightbox(i)}
                  aria-label={`ดูรูป: ${img.alt}`}
                >
                  <img src={img.src} alt={img.alt} loading="lazy" />
                </button>
              </figure>
            ))}
          </div>
        </div>

        <div className="hobby-right">
          {slide.eyebrow && <span className="gallery-eyebrow">{slide.eyebrow}</span>}
          <h1 className="hobby-title">{slide.title}</h1>

          <div className="hobby-sections">
            {slide.sections?.map((section, i) => (
              <div key={i} className="hobby-section">
                <h2 className="hobby-section-heading">{section.heading}</h2>
                <ul className="hobby-list">
                  {section.items.map((item, j) => (
                    <li key={j} className="hobby-list-item">
                      {item.label && (
                        <span className="hobby-item-label">{item.label}</span>
                      )}
                      <span className="hobby-item-value">{item.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={images}
          index={lightboxIndex}
          onClose={closeLightbox}
          onChangeIndex={setLightboxIndex}
        />
      )}
    </div>
  )
}
