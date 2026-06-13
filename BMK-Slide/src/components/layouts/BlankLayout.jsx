import './layouts.css'

export default function BlankLayout({ slide }) {
  return (
    <div className="slide slide--blank">
      {slide?.children ?? null}
    </div>
  )
}
