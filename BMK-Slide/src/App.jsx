import Presentation from './components/Presentation'
import { slides } from './data/slides'

export default function App() {
  return <Presentation slides={slides} />
}
