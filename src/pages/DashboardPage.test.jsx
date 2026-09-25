import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './DashboardPage';

const { obter } = vi.hoisted(() => ({ obter: vi.fn() }));

vi.mock('../hooks/useProjeto', () => ({
  useProjeto: () => ({
    projeto: { id: 1, nome: 'Expansão comercial' },
    projetoId: '1',
  }),
}));

vi.mock('../services/api', () => ({
  api: { get: obter },
}));

const overview = {
  projeto_id: 1,
  grupo_id: 10,
  periodo: '2026-09',
  base_referencia_id: 50,
  base_referencia: {
    id: 50,
    nome: 'Referência 2024–2025',
    versao: 2,
    modo: 'ENTRE_ENTIDADES',
    periodo_inicial: '2024-01',
    periodo_final: '2025-12',
  },
  quantidade_entidades: 3,
  quantidade_avaliadas: 2,
  quantidade_incompletas: 1,
  ranking: [
    { posicao: 1, entidade_id: 102, entidade_nome: 'Unidade Norte', global_score: 91.4, status: 'CALCULADA' },
    { posicao: 2, entidade_id: 101, entidade_nome: 'Unidade Centro', global_score: 78.2, status: 'CALCULADA' },
  ],
};

function detalhe(entidadeId, nome, score) {
  return {
    projeto_id: 1,
    grupo_id: 10,
    entidade_id: entidadeId,
    entidade_nome: nome,
    base_referencia_id: 50,
    periodo: '2026-09',
    avaliacao: { id: entidadeId + 1000, status: 'CALCULADA', global_score: score },
    evolucao: [
      { periodo: '2026-08', global_score: score - 2, status: 'CALCULADA' },
      { periodo: '2026-09', global_score: score, status: 'CALCULADA' },
    ],
    indicadores: [
      {
        indicador_id: 1,
        indicador_nome: 'Produtividade',
        valor_observado: 125,
        pontuacao_percentil: 84,
        peso_aplicado: 60,
        contribuicao_score: 50.4,
      },
    ],
  };
}

function configurarApi() {
  obter.mockImplementation((caminho) => {
    if (caminho === '/grupos?projeto_id=1') {
      return Promise.resolve([{ id: 10, nome: 'Filiais nacionais', ativo: true }]);
    }
    if (caminho.startsWith('/analytics/overview?')) return Promise.resolve(overview);
    if (caminho.startsWith('/analytics/entidades/102?')) {
      return Promise.resolve(detalhe(102, 'Unidade Norte', 91.4));
    }
    if (caminho.startsWith('/analytics/entidades/101?')) {
      return Promise.resolve(detalhe(101, 'Unidade Centro', 78.2));
    }
    return Promise.reject(new Error(`Consulta inesperada: ${caminho}`));
  });
}

describe('Dashboard analítico macro para micro', () => {
  beforeEach(() => {
    obter.mockReset();
    localStorage.clear();
    configurarApi();
  });

  it('carrega overview, mostra ranking e abre o detalhe da entidade selecionada', async () => {
    render(<DashboardPage />);

    await waitFor(() => expect(obter).toHaveBeenCalledWith(expect.stringMatching(
      /^\/analytics\/overview\?projeto_id=1&grupo_id=10&periodo=\d{4}-\d{2}$/,
    )));
    expect(await screen.findByRole('heading', { name: 'Ranking do período' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unidade Norte/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unidade Centro/ })).toBeInTheDocument();
    expect(screen.getByText('Referência 2024–2025 · v2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Unidade Centro/ }));

    await waitFor(() => expect(obter).toHaveBeenCalledWith(expect.stringMatching(
      /^\/analytics\/entidades\/101\?base_referencia_id=50&periodo=\d{4}-\d{2}$/,
    )));
    expect(await screen.findByRole('heading', { name: 'Unidade Centro' })).toBeInTheDocument();
    expect(screen.getByText('Produtividade')).toBeInTheDocument();
    expect(screen.getByText('P84')).toBeInTheDocument();
    expect(screen.getByText('50,4')).toBeInTheDocument();
  });

  it('ignora a antiga avaliação salva no localStorage', async () => {
    localStorage.setItem('globalscore:ultima-avaliacao-id', '999');

    render(<DashboardPage />);
    await screen.findByRole('heading', { name: 'Ranking do período' });

    expect(obter.mock.calls.some(([caminho]) => caminho.includes('/avaliacoes/999'))).toBe(false);
    expect(obter.mock.calls.some(([caminho]) => caminho.startsWith('/analytics/overview?'))).toBe(true);
  });
});
