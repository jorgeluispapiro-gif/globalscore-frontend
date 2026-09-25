import { EstadoVazio } from '../ui/Estados';

function formatar(valor, casas = 1) {
  if (valor === null || valor === undefined) return '—';
  return Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export function IndicatorDiagnosticList({ dados = [] }) {
  if (!dados.length) return <EstadoVazio compacto titulo="Sem indicadores para este período" descricao="A entidade ainda não possui uma avaliação calculada no período selecionado." />;

  return <div className="indicadores-diagnostico">{dados.map((item) => <article key={item.indicador_id} className="indicador-diagnostico">
    <div className="indicador-diagnostico__identidade"><h3>{item.indicador_nome}</h3><span>Valor observado <strong>{formatar(item.valor_observado)}</strong></span></div>
    <div className="indicador-diagnostico__percentil">
      <div><span>Posição percentílica</span><strong>P{item.pontuacao_percentil ?? '—'}</strong></div>
      <div className="percentil-trilho" aria-label={`Percentil ${item.pontuacao_percentil ?? 'indisponível'} de ${item.indicador_nome}`}><i style={{ width: `${Math.max(0, Math.min(100, item.pontuacao_percentil ?? 0))}%` }} /></div>
    </div>
    <dl><div><dt>Peso</dt><dd>{formatar(item.peso_aplicado)}%</dd></div><div><dt>Contribuição</dt><dd>{formatar(item.contribuicao_score)}</dd></div></dl>
  </article>)}</div>;
}
