import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './DashboardPage';

const { obter, enviar, alterar, remover } = vi.hoisted(() => ({
  obter: vi.fn(),
  enviar: vi.fn(),
  alterar: vi.fn(),
  remover: vi.fn(),
}));

vi.mock('../hooks/useProjeto', () => ({
  useProjeto: () => ({
    projeto: { id: 1, nome: 'Expansão comercial' },
    projetoId: '1',
  }),
}));

vi.mock('../services/api', () => ({
  api: { get: obter, post: enviar, patch: alterar, delete: remover },
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
    leitura_periodo: {
      global_score_atual: score,
      global_score_anterior: score - 2,
      variacao_absoluta: 2,
      tendencia: 'SUBIU',
    },
    evolucao: [
      { periodo: '2026-08', global_score: score - 2, status: 'CALCULADA', eventos: [] },
      { periodo: '2026-09', global_score: score, status: 'CALCULADA', eventos: [] },
    ],
    eventos: [],
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

function configurarApi(dadosOverview = overview) {
  obter.mockImplementation((caminho) => {
    if (caminho === '/grupos?projeto_id=1') {
      return Promise.resolve([{ id: 10, nome: 'Filiais nacionais', ativo: true }]);
    }
    if (caminho.startsWith('/analytics/overview?')) return Promise.resolve(dadosOverview);
    if (caminho.startsWith('/analytics/entidades/102?')) {
      return Promise.resolve(detalhe(102, 'Unidade Norte', 91.4));
    }
    if (caminho.startsWith('/analytics/entidades/101?')) {
      return Promise.resolve(detalhe(101, 'Unidade Centro', 78.2));
    }
    if (caminho.startsWith('/analytics/entidades/103?')) {
      return Promise.resolve(detalhe(103, 'Unidade Histórica', 82.6));
    }
    if (caminho.startsWith('/eventos?')) return Promise.resolve([]);
    return Promise.reject(new Error(`Consulta inesperada: ${caminho}`));
  });
}

describe('Dashboard analítico macro para micro', () => {
  beforeEach(() => {
    obter.mockReset();
    enviar.mockReset();
    alterar.mockReset();
    remover.mockReset();
    enviar.mockResolvedValue({});
    alterar.mockResolvedValue({});
    remover.mockResolvedValue(null);
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

  it('carrega a entidade de referência sem criar ranking no modo histórico', async () => {
    obter.mockReset();
    configurarApi({
      ...overview,
      quantidade_entidades: 1,
      quantidade_avaliadas: 1,
      ranking: [],
      base_referencia: {
        ...overview.base_referencia,
        modo: 'HISTORICO_ENTIDADE',
        entidade_referencia_id: 103,
      },
    });

    render(<DashboardPage />);

    await waitFor(() => expect(obter).toHaveBeenCalledWith(expect.stringMatching(
      /^\/analytics\/entidades\/103\?base_referencia_id=50&periodo=\d{4}-\d{2}$/,
    )));
    expect(await screen.findByRole('heading', { name: 'Unidade Histórica' })).toBeInTheDocument();
    expect(screen.getByText('Ranking não aplicável')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Evolução do Global Score' })).toBeInTheDocument();
    expect(screen.getByText('Produtividade')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Unidade Histórica/ })).not.toBeInTheDocument();
  });

  it('registra um evento e atualiza a linha do tempo sem recarregar a página', async () => {
    let eventoCriado = null;
    obter.mockImplementation((caminho) => {
      if (caminho === '/grupos?projeto_id=1') return Promise.resolve([{ id: 10, nome: 'Filiais nacionais', ativo: true }]);
      if (caminho.startsWith('/analytics/overview?')) return Promise.resolve(overview);
      if (caminho.startsWith('/analytics/entidades/102?')) {
        const dados = detalhe(102, 'Unidade Norte', 91.4);
        if (eventoCriado) {
          dados.eventos = [eventoCriado];
          dados.evolucao[1].eventos = [eventoCriado];
        }
        return Promise.resolve(dados);
      }
      if (caminho.startsWith('/eventos?')) return Promise.resolve(eventoCriado ? [eventoCriado] : []);
      return Promise.reject(new Error(`Consulta inesperada: ${caminho}`));
    });
    enviar.mockImplementation((_caminho, dados) => {
      eventoCriado = { id: 9, ...dados, criado_em: '2026-09-10T10:00:00' };
      return Promise.resolve(eventoCriado);
    });

    render(<DashboardPage />);
    await screen.findByRole('heading', { name: 'Eventos registrados' });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar evento' }));
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Treinamento da equipe' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar evento' }));

    await waitFor(() => expect(enviar).toHaveBeenCalledWith('/eventos', expect.objectContaining({
      projeto_id: 1,
      entidade_id: 102,
      titulo: 'Treinamento da equipe',
    })));
    expect((await screen.findAllByText('Treinamento da equipe')).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('heading', { name: 'Unidade Norte' })).toBeInTheDocument();
  });

  it('aciona a impressão do relatório sem alterar os dados', async () => {
    const imprimir = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<DashboardPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Exportar relatório' }));

    expect(imprimir).toHaveBeenCalledOnce();
    expect(enviar).not.toHaveBeenCalled();
    expect(alterar).not.toHaveBeenCalled();
    expect(remover).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Unidade Norte' })).toBeInTheDocument();
    imprimir.mockRestore();
  });
});
