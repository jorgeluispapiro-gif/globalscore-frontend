import { ChevronRight } from 'lucide-react';
import { EstadoVazio } from '../ui/Estados';

function formatarScore(valor) {
  return Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function RankingPanel({ dados = [], entidadeId, modoBase, aoSelecionar }) {
  if (modoBase !== 'ENTRE_ENTIDADES') return <EstadoVazio compacto titulo="Ranking não aplicável" descricao="Esta referência acompanha uma única entidade ao longo do tempo." />;
  if (!dados.length) return <EstadoVazio compacto titulo="Sem resultados no período" descricao="Processe as avaliações do período para comparar as entidades." />;

  return <ol className="ranking-analitico">{dados.map((item) => {
    const selecionado = String(item.entidade_id) === String(entidadeId);
    return <li key={item.entidade_id}>
      <button type="button" aria-pressed={selecionado} className={selecionado ? 'ranking-analitico__item ranking-analitico__item--selecionado' : 'ranking-analitico__item'} onClick={() => aoSelecionar?.(item.entidade_id)}>
        <span className="ranking-analitico__posicao">{String(item.posicao).padStart(2, '0')}</span>
        <span className="ranking-analitico__nome">{item.entidade_nome}</span>
        <strong>{formatarScore(item.global_score)}</strong>
        <ChevronRight aria-hidden="true" />
      </button>
    </li>;
  })}</ol>;
}
