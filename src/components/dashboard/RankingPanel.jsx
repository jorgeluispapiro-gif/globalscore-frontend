import { EstadoVazio } from '../ui/Estados';

export function RankingPanel({ dados = [], entidadeId, modoBase }) {
  if (modoBase !== 'ENTRE_ENTIDADES') return <EstadoVazio compacto titulo="Ranking não aplicável" descricao="Bases de histórico individual acompanham a própria unidade e não produzem ranking." />;
  if (!dados.length) return <EstadoVazio compacto titulo="Ranking ainda indisponível" descricao="Não há resultados comparáveis disponíveis para este período." />;
  return <ol className="ranking-lista">{dados.map((item, indice) => <li key={item.entidade_id} className={item.entidade_id === entidadeId ? 'ranking-lista__selecionado' : ''}><span>{indice + 1}</span><strong>{item.nome}</strong><b>{item.global_score.toFixed(1)}</b></li>)}</ol>;
}
