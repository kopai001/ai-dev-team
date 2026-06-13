import './ProgressBar.css'

export default function ProgressBar({ current, total }) {
  const pct = total > 1 ? (current / (total - 1)) * 100 : 100
  return (
    <div className="progress-track" role="progressbar" aria-valuenow={current + 1} aria-valuemax={total}>
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}
