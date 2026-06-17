import { useState, useEffect, useRef } from 'react'
import TitleLayout from './layouts/TitleLayout'
import SectionLayout from './layouts/SectionLayout'
import ContentLayout from './layouts/ContentLayout'
import TwoColumnLayout from './layouts/TwoColumnLayout'
import QuoteLayout from './layouts/QuoteLayout'
import ImageLayout from './layouts/ImageLayout'
import BlankLayout from './layouts/BlankLayout'
import ProfileLayout from './layouts/ProfileLayout'
import GalleryLayout from './layouts/GalleryLayout'
import HobbyLayout from './layouts/HobbyLayout'
import ProductCardsLayout from './layouts/ProductCardsLayout'
import TimelineLayout from './layouts/TimelineLayout'
import IconListLayout from './layouts/IconListLayout'
import ThankYouLayout from './layouts/ThankYouLayout'
import './SlideWrapper.css'

const LAYOUTS = {
  title: TitleLayout,
  section: SectionLayout,
  content: ContentLayout,
  'two-column': TwoColumnLayout,
  quote: QuoteLayout,
  image: ImageLayout,
  blank: BlankLayout,
  profile: ProfileLayout,
  gallery: GalleryLayout,
  hobby: HobbyLayout,
  'product-cards': ProductCardsLayout,
  timeline: TimelineLayout,
  'icon-list': IconListLayout,
  'thank-you': ThankYouLayout,
}

function SlideLayer({ slide, className }) {
  const Layout = LAYOUTS[slide?.layout] ?? BlankLayout
  return (
    <div className={`slide-layer ${className}`}>
      <Layout slide={slide} />
    </div>
  )
}

const DURATION = 220

export default function SlideWrapper({ slides, currentIndex, direction }) {
  const [active, setActive] = useState(currentIndex)
  const [exiting, setExiting] = useState(null)
  const [dir, setDir] = useState(direction)
  const timerRef = useRef(null)
  const isFirst = useRef(true)

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return }
    if (currentIndex === active) return

    clearTimeout(timerRef.current)
    setExiting(active)
    setDir(direction)
    setActive(currentIndex)

    timerRef.current = setTimeout(() => setExiting(null), DURATION)
    return () => clearTimeout(timerRef.current)
  }, [currentIndex])

  return (
    <div className="slide-container">
      {exiting !== null && (
        <SlideLayer
          slide={slides[exiting]}
          className={`slide-exit-${dir}`}
        />
      )}
      <SlideLayer
        key={active}
        slide={slides[active]}
        className={exiting !== null ? `slide-enter-${dir}` : 'slide-static'}
      />
    </div>
  )
}
