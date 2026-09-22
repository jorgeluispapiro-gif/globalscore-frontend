export function MetricCard({ rotulo, valor, detalhe, destaque = false }) {
  return <article className={`metric-card ${destaque ? 'metric-card--destaque' : ''}`}><span>{rotulo}</span><strong>{valor ?? '—'}</strong><small>{detalhe}</small></article>;
}
