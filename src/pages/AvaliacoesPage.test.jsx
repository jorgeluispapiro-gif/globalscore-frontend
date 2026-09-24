import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AvaliacoesPage } from './AvaliacoesPage';

const { obter, enviar, alterar } = vi.hoisted(() => ({
  obter: vi.fn(),
  enviar: vi.fn(),
  alterar: vi.fn(),
}));

vi.mock('../hooks/useProjeto', () => ({
  useProjeto: () => ({ projetoId: '1' }),
}));

vi.mock('../services/api', () => ({
  api: { get: obter, post: enviar, patch: alterar },
}));

const grupo = { id: 10, nome: 'Unidades comerciais', ativo: true };
const entidades = [
  { id: 21, grupo_id: 10, nome: 'Unidade 1', ativa: true },
  { id: 22, grupo_id: 10, nome: 'Unidade 2', ativa: true },
];
const indicador = { id: 31, nome: 'Vendas', ativo: true };

function configurarConsultas(bases = []) {
  obter.mockImplementation((caminho) => {
    if (caminho.startsWith('/grupos')) return Promise.resolve([grupo]);
    if (caminho.startsWith('/entidades')) return Promise.resolve(entidades);
    if (caminho.startsWith('/indicadores')) return Promise.resolve([indicador]);
    if (caminho.startsWith('/bases')) return Promise.resolve(typeof bases === 'function' ? bases() : bases);
    return Promise.resolve([]);
  });
}

describe('fluxo gerencial de avaliações', () => {
  beforeEach(() => {
    obter.mockReset();
    enviar.mockReset();
    alterar.mockReset();
  });

  it('cria, processa, ajusta os pesos e ativa uma Base de Referência', async () => {
    let basesAtuais = [];
    configurarConsultas(() => basesAtuais);
    const rascunho = {
      id: 40, nome: 'Histórico 2024–2025', versao: 1, modo: 'ENTRE_ENTIDADES',
      periodo_inicial: '2024-01', periodo_final: '2025-12', status: 'RASCUNHO',
      quantidade_entidades: 0, indicadores: [],
    };
    const processada = {
      ...rascunho, status: 'PROCESSADA', quantidade_entidades: 2,
      indicadores: [{ indicador_id: 31, status: 'VALIDO', tamanho_populacao: 2, peso_aplicado: 60 }],
    };
    const revisada = {
      ...processada,
      indicadores: [{ indicador_id: 31, status: 'VALIDO', tamanho_populacao: 2, peso_aplicado: 100 }],
    };
    enviar.mockImplementation((caminho) => {
      if (caminho === '/bases') return Promise.resolve(rascunho);
      if (caminho === '/bases/40/processar') return Promise.resolve(processada);
      if (caminho === '/bases/40/ativar') {
        basesAtuais = [{ ...revisada, status: 'ATIVA' }];
        return Promise.resolve(basesAtuais[0]);
      }
      return Promise.resolve({});
    });
    alterar.mockResolvedValue(revisada);

    render(<AvaliacoesPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Nova base' }));
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Histórico 2024–2025' } });
    fireEvent.change(screen.getByLabelText('Início do histórico'), { target: { value: '2024-01' } });
    fireEvent.change(screen.getByLabelText('Fim do histórico'), { target: { value: '2025-12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar base' }));

    await waitFor(() => expect(enviar).toHaveBeenCalledWith('/bases', expect.objectContaining({
      projeto_id: 1,
      grupo_id: 10,
      modo: 'ENTRE_ENTIDADES',
      periodo_inicial: '2024-01',
      periodo_final: '2025-12',
      cobertura_minima_percentual: 50,
    })));
    fireEvent.click(await screen.findByRole('button', { name: 'Processar base' }));
    const campoPeso = await screen.findByLabelText('Peso de Vendas');
    expect(within(screen.getByText('Entidades elegíveis').parentElement).getByText('2')).toBeInTheDocument();
    fireEvent.change(campoPeso, { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar pesos' }));

    await waitFor(() => expect(alterar).toHaveBeenCalledWith('/bases/40/pesos', {
      pesos: { 31: 100 },
    }));
    const botaoAtivar = await screen.findByRole('button', { name: 'Ativar base' });
    await waitFor(() => expect(botaoAtivar).toBeEnabled());
    fireEvent.click(botaoAtivar);

    await waitFor(() => expect(enviar).toHaveBeenCalledWith('/bases/40/ativar'));
    expect(await screen.findByText('Esta é uma referência vigente e congelada. Sua estrutura e suas réguas permanecem preservadas.')).toBeInTheDocument();
  });

  it('processa um intervalo em lote e apresenta o resumo por entidade e período', async () => {
    const ativa = {
      id: 50, nome: 'Referência vigente', versao: 1, modo: 'ENTRE_ENTIDADES',
      periodo_inicial: '2024-01', periodo_final: '2025-12', status: 'ATIVA',
      quantidade_entidades: 2,
      indicadores: [{ indicador_id: 31, status: 'VALIDO', tamanho_populacao: 2, peso_aplicado: 100 }],
    };
    configurarConsultas([ativa]);
    enviar.mockResolvedValue({
      base_referencia_id: 50,
      periodo_inicial: '2026-04',
      periodo_final: '2026-05',
      quantidade_processadas: 2,
      quantidade_incompletas: 1,
      quantidade_ja_existentes: 1,
      quantidade_erros: 0,
      resultados: [
        { entidade_id: 21, periodo: '2026-04', status: 'CALCULADA', global_score: 78.4 },
        { entidade_id: 22, periodo: '2026-04', status: 'INCOMPLETA', global_score: null },
        { entidade_id: 21, periodo: '2026-05', status: 'JA_EXISTENTE', avaliacao_id: 8 },
      ],
    });

    render(<AvaliacoesPage />);
    fireEvent.change(await screen.findByLabelText('Base ativa'), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('Período inicial'), { target: { value: '2026-04' } });
    fireEvent.change(screen.getByLabelText('Período final'), { target: { value: '2026-05' } });
    fireEvent.click(screen.getByRole('button', { name: 'Processar resultados' }));

    await waitFor(() => expect(enviar).toHaveBeenCalledWith('/avaliacoes/processar-lote', {
      base_referencia_id: 50,
      periodo_inicial: '2026-04',
      periodo_final: '2026-05',
    }));
    const resumo = await screen.findByLabelText('Resumo do processamento');
    expect(within(resumo).getByText('Processadas')).toBeInTheDocument();
    expect(within(resumo).getByText('Incompletas')).toBeInTheDocument();
    expect(within(resumo).getByText('Já existentes')).toBeInTheDocument();
    expect(within(resumo).getAllByText('Unidade 1')).toHaveLength(2);
    expect(within(resumo).getByText('Unidade 2')).toBeInTheDocument();
    expect(within(resumo).getByText('78,4')).toBeInTheDocument();
  });
});
