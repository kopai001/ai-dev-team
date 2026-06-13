import TitleLayout from './layouts/TitleLayout'
import SectionLayout from './layouts/SectionLayout'
import ContentLayout from './layouts/ContentLayout'
import TwoColumnLayout from './layouts/TwoColumnLayout'
import QuoteLayout from './layouts/QuoteLayout'
import ImageLayout from './layouts/ImageLayout'
import BlankLayout from './layouts/BlankLayout'
import './SlideWrapper.css'

const LAYOUTS = {
  title: TitleLayout,
  section: SectionLayout,
  content: ContentLayout,
  'two-column': TwoColumnLayout,
  quote: QuoteLayout,
  image: ImageLayout,
  blank: BlankLayout,
}

export default function SlideWrapper({ slide, direction }) {
  const Layout = LAYOUTS[slide?.layout] ?? BlankLayout

  return (
    <div className={`slide-wrapper slide-enter-${direction}`}>
      <div className="slide-inner">
        <Layout slide={slide} />
      </div>
    </div>
  )
}
