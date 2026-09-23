import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportacoesPage } from './ImportacoesPage';

const { obter, enviar } = vi.hoisted(() => ({ obter: vi.fn(), enviar: vi.fn() }));

vi.mock('../hooks/useProjeto', () => ({
  useProjeto: () => ({ projeto: { id: 1, nome: 'Projeto teste' }, projetoId: '1' }),
}));

vi.mock('../services/api', () => ({ api: { get: obter, post: enviar } }));

const pendenteBasico = {
  id: 31,
  projeto_id: 1,
  nome_arquivo_original: 'janeiro.csv',
  tipo_arquivo: 'CSV',
  status: 'ANALISADA',
  criado_em: '2026-09-23T10:00:00Z',
  quantidade_linhas_lidas: 3,
  quantidade_erros: 0,
  quantidade_alertas: 0,
  configuracao_leitura: null,
  mapeamento: null,
};

function configurarConsultas(pendentes, extras = {}) {
  obter.mockImplementation((caminho) => {
    if (caminho.startsWith('/indicadores')) return Promise.resolve(extras.indicadores || []);
    if (caminho.startsWith('/entidades')) return Promise.resolve(extras.entidades || []);
    if (caminho.startsWith('/grupos')) return Promise.resolve(extras.grupos || []);
    if (caminho.startsWith('/importacoes?')) return Promise.resolve(pendentes);
    if (caminho.endsWith('/inspecao')) return extras.inspecao instanceof Error
      ? Promise.reject(extras.inspecao)
      : Promise.resolve(extras.inspecao);
    return Promise.resolve([]);
  });
}

describe('retomada visual da importação', () => {
  beforeEach(() => {
    obter.mockReset();
    enviar.mockReset();
    enviar.mockResolvedValue({});
  });

  it('mantém o upload normal quando não existem pendências', async () => {
    configurarConsultas([]);
    render(<ImportacoesPage />);
    expect(await screen.findByLabelText('Arquivo de dados')).toBeInTheDocument();
    expect(screen.queryByText('Importações em andamento')).not.toBeInTheDocument();
  });

  it('apresenta múltiplos lotes sem selecionar nenhum e mantém novo upload disponível', async () => {
    configurarConsultas([pendenteBasico, { ...pendenteBasico, id: 32, nome_arquivo_original: 'fevereiro.xlsx', tipo_arquivo: 'XLSX' }]);
    render(<ImportacoesPage />);
    expect(await screen.findByText('Importações em andamento')).toBeInTheDocument();
    expect(screen.getByText('janeiro.csv')).toBeInTheDocument();
    expect(screen.getByText('fevereiro.xlsx')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'CONTINUAR' })).toHaveLength(2);
    expect(screen.getByLabelText('Arquivo de dados')).toBeInTheDocument();
    expect(screen.queryByText('Mapeie as colunas')).not.toBeInTheDocument();
  });

  it('restaura mapeamento e decisões e executa a revalidação automática', async () => {
    const pendente = {
      ...pendenteBasico,
      status: 'VALIDADA',
      configuracao_leitura: {
        linha_inicial: 3, linhas_cabecalho: [2], delimitador: '|', formato_periodo: 'AAAA-MM',
        formato_numerico: { separador_decimal: '.', separador_milhar: ',', percentual_como: 'NUMERO' },
      },
      mapeamento: {
        formato: 'LARGO',
        colunas: [
          { indice_coluna: 1, papel: 'CODIGO_ENTIDADE' },
          { indice_coluna: 2, papel: 'VALOR_INDICADOR', indicador: { acao: 'EXISTENTE', indicador_id: 8 } },
          { indice_coluna: 3, papel: 'VALOR_INDICADOR', indicador: { acao: 'CRIAR', dados: { codigo: 'NOVO', nome: 'Novo indicador', unidade_medida: '%', direcao: 'MAIOR_MELHOR', peso_percentual: 35, obrigatorio: false, participa_global_score: true } } },
        ],
        decisoes_entidades: {
          U01: { acao: 'CRIAR', grupo_id: 3, nome: 'Unidade 1' },
          U02: { acao: 'ASSOCIAR', entidade_id: 14 },
          U03: { acao: 'IGNORAR' },
        },
      },
    };
    configurarConsultas([pendente], {
      indicadores: [{ id: 8, codigo: 'EXISTE', nome: 'Indicador existente', unidade_medida: 'un', direcao: 'MAIOR_MELHOR', peso_percentual: 65, participa_global_score: true, ativo: true }],
      entidades: [{ id: 14, codigo: 'E14', nome: 'Entidade 14', grupo_id: 3, ativa: true }],
      grupos: [{ id: 3, nome: 'Grupo 3', ativo: true }],
      inspecao: { tipo_arquivo: 'CSV', sugestao_delimitador: ';', preview: [['codigo', 'existente', 'novo'], ['U01', '10', '20']] },
    });
    enviar.mockImplementation((caminho) => caminho.endsWith('/validar')
      ? Promise.resolve({ quantidade_erros: 3, quantidade_alertas: 0, linhas_lidas: 3, observacoes_a_criar: 0, status: 'COM_ERROS', erros: ['U01', 'U02', 'U03'].map((codigo, indice) => ({ tipo: 'ENTIDADE_DESCONHECIDA', valor_original: codigo, linha: indice + 3 })), alertas: [] })
      : Promise.resolve({}));
    render(<ImportacoesPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'CONTINUAR' }));

    await waitFor(() => expect(obter).toHaveBeenCalledWith('/importacoes/31/inspecao'));
    await waitFor(() => expect(enviar).toHaveBeenCalledWith('/importacoes/31/validar', expect.any(Object)));
    expect(screen.getByLabelText('Delimitador')).toHaveValue('|');
    expect(screen.getByLabelText('Indicador existente da coluna existente')).toHaveValue('8');
    expect(screen.getByLabelText('Código do novo indicador da coluna novo')).toHaveValue('NOVO');
    expect(screen.getByLabelText('Nome do novo indicador da coluna novo')).toHaveValue('Novo indicador');
    expect(screen.getByLabelText('Unidade do novo indicador da coluna novo')).toHaveValue('%');
    expect(screen.getByLabelText('Direção do novo indicador da coluna novo')).toHaveValue('MAIOR_MELHOR');
    expect(screen.getByLabelText('Peso do novo indicador da coluna novo')).toHaveValue(35);
    expect(screen.getByLabelText('Decisão para a entidade U01')).toHaveValue('CRIAR');
    expect(screen.getByLabelText('Grupo da nova entidade U01')).toHaveValue('3');
    expect(screen.getByLabelText('Decisão para a entidade U02')).toHaveValue('ASSOCIAR');
    expect(screen.getByLabelText('Entidade existente para U02')).toHaveValue('14');
    expect(screen.getByLabelText('Decisão para a entidade U03')).toHaveValue('IGNORAR');
    expect(enviar.mock.calls.some(([caminho]) => caminho === '/entidades' || caminho === '/indicadores')).toBe(false);
  });

  it('retoma lote sem mapeamento na etapa inicial sem revalidar', async () => {
    configurarConsultas([pendenteBasico], { inspecao: { tipo_arquivo: 'CSV', sugestao_delimitador: ';', preview: [['codigo', 'periodo'], ['U01', '01/2026']] } });
    render(<ImportacoesPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'CONTINUAR' }));
    expect(await screen.findByText('Mapeie as colunas')).toBeInTheDocument();
    expect(screen.getByLabelText('Mapeamento da coluna codigo')).toHaveValue('CODIGO_ENTIDADE');
    expect(enviar.mock.calls.some(([caminho]) => caminho.endsWith('/validar'))).toBe(false);
  });

  it('descarta somente após confirmação e remove o lote da lista', async () => {
    configurarConsultas([pendenteBasico]);
    enviar.mockResolvedValue({ status: 'CANCELADA' });
    render(<ImportacoesPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'DESCARTAR' }));
    expect(screen.getByText('Descartar esta importação?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'CANCELAR' }));
    expect(enviar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'DESCARTAR' }));
    fireEvent.click(screen.getByRole('button', { name: 'DESCARTAR IMPORTAÇÃO' }));
    await waitFor(() => expect(enviar).toHaveBeenCalledWith('/importacoes/31/anular'));
    expect(screen.queryByText('janeiro.csv')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Arquivo de dados')).toBeInTheDocument();
  });

  it('mantém a página utilizável quando a inspeção retorna 409', async () => {
    const erro = new Error('Conflito');
    erro.status = 409;
    configurarConsultas([pendenteBasico], { inspecao: erro });
    render(<ImportacoesPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'CONTINUAR' }));
    expect(await screen.findByText('Este arquivo não está mais disponível para continuar a importação.')).toBeInTheDocument();
    const cartao = screen.getByText('janeiro.csv').closest('article');
    expect(within(cartao).getByRole('button', { name: 'DESCARTAR' })).toBeInTheDocument();
    expect(screen.getByLabelText('Arquivo de dados')).toBeInTheDocument();
  });

  it('descartar e trocar arquivo anula o lote ativo antes de voltar ao upload', async () => {
    configurarConsultas([]);
    enviar.mockImplementation((caminho) => {
      if (caminho === '/importacoes') return Promise.resolve({ ...pendenteBasico, id: 40, inspecao: { tipo_arquivo: 'CSV', sugestao_delimitador: ';', preview: [['codigo'], ['U01']] } });
      if (caminho === '/importacoes/40/anular') return Promise.resolve({ status: 'CANCELADA' });
      return Promise.resolve({});
    });
    render(<ImportacoesPage />);
    const campo = await screen.findByLabelText('Arquivo de dados');
    fireEvent.change(campo, { target: { files: [new File(['codigo\nU01'], 'dados.csv')] } });
    fireEvent.submit(campo.closest('form'));
    fireEvent.click(await screen.findByRole('button', { name: 'DESCARTAR E TROCAR ARQUIVO' }));
    expect(enviar.mock.calls.some(([caminho]) => caminho.endsWith('/anular'))).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'DESCARTAR IMPORTAÇÃO' }));
    await waitFor(() => expect(enviar).toHaveBeenCalledWith('/importacoes/40/anular'));
    expect(await screen.findByLabelText('Arquivo de dados')).toBeInTheDocument();
  });

  it('remove o lote das pendências depois da confirmação concluída', async () => {
    const pendente = {
      ...pendenteBasico,
      mapeamento: { formato: 'LARGO', colunas: [{ indice_coluna: 1, papel: 'CODIGO_ENTIDADE' }], decisoes_entidades: {} },
      configuracao_leitura: { linha_inicial: 2, linhas_cabecalho: [1], delimitador: ';', formato_periodo: 'MM/AAAA' },
    };
    configurarConsultas([pendente], { inspecao: { tipo_arquivo: 'CSV', sugestao_delimitador: ';', preview: [['codigo'], ['U01']] } });
    enviar.mockImplementation((caminho) => {
      if (caminho.endsWith('/validar')) return Promise.resolve({ quantidade_erros: 0, quantidade_alertas: 0, linhas_lidas: 1, observacoes_a_criar: 1, entidades_reconhecidas: 1, novas_entidades: [], status: 'VALIDADA', erros: [], alertas: [] });
      if (caminho.endsWith('/confirmar')) return Promise.resolve({ id: 31, status: 'CONCLUIDA', observacoes_criadas: 1, nome_arquivo_original: 'janeiro.csv' });
      return Promise.resolve({});
    });
    render(<ImportacoesPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'CONTINUAR' }));
    fireEvent.click(await screen.findByRole('button', { name: 'CONFIRMAR IMPORTAÇÃO' }));
    expect(await screen.findByText('Importação concluída')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Importar outro arquivo' }));
    expect(screen.queryByText('janeiro.csv')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Arquivo de dados')).toBeInTheDocument();
  });
});
