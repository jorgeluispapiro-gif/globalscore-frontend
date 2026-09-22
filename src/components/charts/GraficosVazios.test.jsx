import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { IndicatorBarChart } from './IndicatorBarChart';
import { IndicatorRadarChart } from './IndicatorRadarChart';
import { ScoreEvolutionChart } from './ScoreEvolutionChart';
import { RankingPanel } from '../dashboard/RankingPanel';

describe('estados vazios do dashboard', () => {
  it('explica quando a evolução não possui dois períodos', () => {
    render(<ScoreEvolutionChart dados={[]} />);
    expect(screen.getByText('Não há avaliações suficientes para exibir a evolução')).toBeInTheDocument();
  });

  it('não quebra o radar sem indicadores suficientes', () => {
    render(<IndicatorRadarChart dados={[]} />);
    expect(screen.getByText('Perfil ainda incompleto')).toBeInTheDocument();
  });

  it('não quebra as barras com lista vazia', () => {
    render(<IndicatorBarChart dados={[]} />);
    expect(screen.getByText('Indicadores sem resultado')).toBeInTheDocument();
  });

  it('não oferece ranking para uma base histórica individual', () => {
    render(<RankingPanel dados={[]} modoBase="HISTORICO_ENTIDADE" />);
    expect(screen.getByText('Ranking não aplicável')).toBeInTheDocument();
  });
});
