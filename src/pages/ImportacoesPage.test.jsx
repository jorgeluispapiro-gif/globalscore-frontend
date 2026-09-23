import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportacoesPage } from './ImportacoesPage';

const { obter, enviar } = vi.hoisted(() => ({
  obter: vi.fn(),
  enviar: vi.fn(),
}));

vi.mock('../hooks/useProjeto', () => ({
  useProjeto: () => ({ projeto: { id: 1, nome: 'Projeto teste' }, projetoId: '1' }),
}));

vi.mock('../services/api', () => ({
  api: { get: obter, post: enviar },
}));

describe('indicadores dentro da importação', () => {
  beforeEach(() => {
    obter.mockReset();
    enviar.mockReset();
    obter.mockResolvedValue([]);
    enviar.mockImplementation((caminho) => {
      if (caminho === '/importacoes') {
        return Promise.resolve({
          id: 9,
          tipo_arquivo: 'CSV',
          nome_arquivo_original: 'dados.csv',
          inspecao: {
            sugestao_delimitador: ';',
            preview: [
              ['codigo', 'periodo', 'produtividade'],
              ['U01', '01/2026', '98'],
            ],
          },
        });
      }
      return Promise.resolve({
        quantidade_erros: 0,
        quantidade_alertas: 0,
        linhas_lidas: 1,
        observacoes_a_criar: 1,
        erros: [],
        alertas: [],
        status: 'VALIDADA',
      });
    });
  });

  it('agrupa entidades desconhecidas, filtra opções ativas e revalida com as decisões', async () => {
    obter.mockImplementation((caminho) => {
      if (caminho.startsWith('/indicadores')) return Promise.resolve([]);
      if (caminho.startsWith('/entidades')) return Promise.resolve([
        { id: 11, codigo: 'E01', nome: 'Existente', grupo_id: 21, ativa: true },
        { id: 12, codigo: 'E02', nome: 'Inativa', grupo_id: 21, ativa: false },
      ]);
      return Promise.resolve([
        { id: 21, nome: 'Grupo ativo', ativo: true },
        { id: 22, nome: 'Grupo inativo', ativo: false },
      ]);
    });
    let validacoes = 0;
    enviar.mockImplementation((caminho) => {
      if (caminho === '/importacoes') return Promise.resolve({ id: 9, tipo_arquivo: 'CSV', nome_arquivo_original: 'dados.csv', inspecao: { sugestao_delimitador: ';', preview: [['codigo', 'periodo', 'produtividade'], ['U01', '01/2026', '98']] } });
      validacoes += 1;
      if (validacoes === 1) return Promise.resolve({ quantidade_erros: 6, quantidade_alertas: 0, linhas_lidas: 6, observacoes_a_criar: 0, status: 'COM_ERROS', erros: Array.from({ length: 6 }, (_, indice) => ({ tipo: 'ENTIDADE_DESCONHECIDA', valor_original: 'U01', linha: indice + 2, mensagem: 'Entidade desconhecida' })), alertas: [] });
      return Promise.resolve({ quantidade_erros: 0, quantidade_alertas: 0, linhas_lidas: 6, observacoes_a_criar: 6, entidades_reconhecidas: 1, novas_entidades: [], status: 'VALIDADA', erros: [], alertas: [] });
    });
    render(<ImportacoesPage />);
    const arquivo = new File(['codigo;periodo;produtividade'], 'dados.csv', { type: 'text/csv' });
    const campoArquivo = await screen.findByLabelText('Arquivo de dados');
    fireEvent.change(campoArquivo, { target: { files: [arquivo] } });
    fireEvent.submit(campoArquivo.closest('form'));
    await screen.findByText('Mapeie as colunas');
    fireEvent.change(screen.getByLabelText('Mapeamento da coluna produtividade'), { target: { value: 'CRIAR_INDICADOR' } });
    fireEvent.change(screen.getByLabelText('Código do novo indicador da coluna produtividade'), { target: { value: 'PROD' } });
    fireEvent.change(screen.getByLabelText('Unidade do novo indicador da coluna produtividade'), { target: { value: 'unidades' } });
    fireEvent.change(screen.getByLabelText('Direção do novo indicador da coluna produtividade'), { target: { value: 'MAIOR_MELHOR' } });
    fireEvent.change(screen.getByLabelText('Peso do novo indicador da coluna produtividade'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'VALIDAR SEM GRAVAR' }));

    expect(await screen.findByText('Entidades a resolver')).toBeInTheDocument();
    expect(screen.getByText('1 entidade(s) desconhecida(s) · 6 linha(s) afetada(s)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'REVALIDAR DADOS' }));
    expect(await screen.findByText('Defina como esta entidade deve ser tratada.')).toBeInTheDocument();
    expect(screen.getByText('Revise as entidades pendentes antes de revalidar.')).toBeInTheDocument();
    expect(enviar).toHaveBeenCalledTimes(2);

    fireEvent.change(screen.getByLabelText('Decisão para a entidade U01'), { target: { value: 'ASSOCIAR' } });
    const seletor = screen.getByLabelText('Entidade existente para U01');
    expect(within(seletor).getByRole('option', { name: 'E01 · Existente · Grupo ativo' })).toBeInTheDocument();
    expect(within(seletor).queryByText(/Inativa/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'REVALIDAR DADOS' }));
    expect(await screen.findByText('Selecione a entidade existente.')).toBeInTheDocument();
    expect(enviar).toHaveBeenCalledTimes(2);

    fireEvent.change(seletor, { target: { value: '11' } });
    fireEvent.click(screen.getByRole('button', { name: 'REVALIDAR DADOS' }));

    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(3));
    const payload = enviar.mock.calls.at(-1)[1];
    expect(payload.mapeamento.decisoes_entidades).toEqual({ U01: { acao: 'ASSOCIAR', entidade_id: 11 } });
    expect(payload.mapeamento.colunas[2].indicador).toMatchObject({ acao: 'CRIAR', dados: { codigo: 'PROD' } });
    expect(enviar.mock.calls.some(([caminho]) => caminho === '/entidades')).toBe(false);
    expect(await screen.findByText(/Reconhecidas:/)).toBeInTheDocument();
  });

  it('planeja um novo indicador sem persistir antes da confirmação', async () => {
    render(<ImportacoesPage />);
    await waitFor(() => expect(obter).toHaveBeenCalledWith('/indicadores?projeto_id=1'));

    const arquivo = new File(['codigo;periodo;produtividade'], 'dados.csv', { type: 'text/csv' });
    const campoArquivo = await screen.findByLabelText('Arquivo de dados');
    fireEvent.change(campoArquivo, { target: { files: [arquivo] } });
    fireEvent.submit(campoArquivo.closest('form'));

    await screen.findByText('Mapeie as colunas');
    fireEvent.change(screen.getByLabelText('Mapeamento da coluna produtividade'), { target: { value: 'CRIAR_INDICADOR' } });
    fireEvent.change(screen.getByLabelText('Código do novo indicador da coluna produtividade'), { target: { value: 'PROD' } });
    fireEvent.change(screen.getByLabelText('Unidade do novo indicador da coluna produtividade'), { target: { value: 'unidades' } });
    fireEvent.change(screen.getByLabelText('Direção do novo indicador da coluna produtividade'), { target: { value: 'MAIOR_MELHOR' } });
    fireEvent.change(screen.getByLabelText('Peso do novo indicador da coluna produtividade'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'VALIDAR SEM GRAVAR' }));

    await waitFor(() => expect(enviar).toHaveBeenCalledWith('/importacoes/9/validar', expect.any(Object)));
    const chamadaValidacao = enviar.mock.calls.find(([caminho]) => caminho === '/importacoes/9/validar');
    expect(chamadaValidacao[1].mapeamento.colunas[2]).toEqual({
      indice_coluna: 3,
      papel: 'VALOR_INDICADOR',
      indicador: {
        acao: 'CRIAR',
        dados: {
          codigo: 'PROD',
          nome: 'Produtividade',
          unidade_medida: 'unidades',
          direcao: 'MAIOR_MELHOR',
          peso_percentual: 100,
          obrigatorio: true,
          participa_global_score: true,
        },
      },
    });
    expect(enviar.mock.calls.some(([caminho]) => caminho === '/indicadores')).toBe(false);
    expect(enviar.mock.calls.some(([caminho]) => caminho.endsWith('/confirmar'))).toBe(false);
  });

  it('impede a validação enquanto faltam decisões obrigatórias', async () => {
    render(<ImportacoesPage />);
    const arquivo = new File(['codigo;periodo;produtividade'], 'dados.csv', { type: 'text/csv' });
    const campoArquivo = await screen.findByLabelText('Arquivo de dados');
    fireEvent.change(campoArquivo, { target: { files: [arquivo] } });
    fireEvent.submit(campoArquivo.closest('form'));

    await screen.findByText('Mapeie as colunas');
    fireEvent.change(screen.getByLabelText('Mapeamento da coluna produtividade'), { target: { value: 'CRIAR_INDICADOR' } });
    fireEvent.click(screen.getByRole('button', { name: 'VALIDAR SEM GRAVAR' }));

    expect(await screen.findByText('Informe o código.')).toBeInTheDocument();
    expect(screen.getByText('Informe a unidade de medida.')).toBeInTheDocument();
    expect(screen.getByText('Selecione a direção.')).toBeInTheDocument();
    expect(screen.getByText('Informe um peso entre 0 e 100.')).toBeInTheDocument();
    expect(enviar.mock.calls.some(([caminho]) => caminho === '/importacoes/9/validar')).toBe(false);
  });

  it('oferece somente indicadores ativos para uma nova associação', async () => {
    obter.mockResolvedValueOnce([
      {
        id: 1, nome: 'Qualidade ativa', codigo: 'QUAL', unidade_medida: '%',
        direcao: 'MAIOR_MELHOR', peso_percentual: 60, participa_global_score: true, ativo: true,
      },
      {
        id: 2, nome: 'Indicador inativo', codigo: 'INATIVO', unidade_medida: 'unidades',
        direcao: 'MENOR_MELHOR', peso_percentual: 40, participa_global_score: true, ativo: false,
      },
    ]);
    render(<ImportacoesPage />);

    const arquivo = new File(['codigo;periodo;produtividade'], 'dados.csv', { type: 'text/csv' });
    const campoArquivo = await screen.findByLabelText('Arquivo de dados');
    fireEvent.change(campoArquivo, { target: { files: [arquivo] } });
    fireEvent.submit(campoArquivo.closest('form'));

    await screen.findByText('Mapeie as colunas');
    fireEvent.change(screen.getByLabelText('Mapeamento da coluna produtividade'), { target: { value: 'ASSOCIAR_INDICADOR' } });

    const seletor = screen.getByLabelText('Indicador existente da coluna produtividade');
    expect(within(seletor).getByRole('option', { name: 'Qualidade ativa · % · Maior é melhor' })).toBeInTheDocument();
    expect(within(seletor).queryByRole('option', { name: /Indicador inativo/ })).not.toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('cria grupo no contexto, seleciona-o e preserva o estado da importação', async () => {
    obter.mockImplementation((caminho) => {
      if (caminho.startsWith('/grupos')) return Promise.resolve([
        { id: 21, nome: 'Grupo existente', ativo: true },
        { id: 22, nome: 'Grupo inativo', ativo: false },
      ]);
      return Promise.resolve([]);
    });
    enviar.mockImplementation((caminho, payload) => {
      if (caminho === '/importacoes') return Promise.resolve({ id: 9, tipo_arquivo: 'CSV', nome_arquivo_original: 'dados.csv', inspecao: { sugestao_delimitador: ';', preview: [['codigo', 'periodo', 'produtividade'], ['U01', '01/2026', '98']] } });
      if (caminho === '/importacoes/9/validar') return Promise.resolve({ quantidade_erros: 1, quantidade_alertas: 0, linhas_lidas: 1, observacoes_a_criar: 0, status: 'COM_ERROS', erros: [{ tipo: 'ENTIDADE_DESCONHECIDA', valor_original: 'U01', linha: 2 }], alertas: [] });
      if (caminho === '/grupos') return Promise.resolve({ id: 23, ...payload });
      return Promise.resolve({});
    });
    render(<ImportacoesPage />);
    const arquivo = new File(['codigo;periodo;produtividade'], 'dados.csv', { type: 'text/csv' });
    const campoArquivo = await screen.findByLabelText('Arquivo de dados');
    fireEvent.change(campoArquivo, { target: { files: [arquivo] } });
    fireEvent.submit(campoArquivo.closest('form'));
    await screen.findByText('Mapeie as colunas');
    fireEvent.change(screen.getByLabelText('Mapeamento da coluna produtividade'), { target: { value: 'CRIAR_INDICADOR' } });
    fireEvent.change(screen.getByLabelText('Código do novo indicador da coluna produtividade'), { target: { value: 'PROD' } });
    fireEvent.change(screen.getByLabelText('Unidade do novo indicador da coluna produtividade'), { target: { value: 'unidades' } });
    fireEvent.change(screen.getByLabelText('Direção do novo indicador da coluna produtividade'), { target: { value: 'MAIOR_MELHOR' } });
    fireEvent.change(screen.getByLabelText('Peso do novo indicador da coluna produtividade'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: 'VALIDAR SEM GRAVAR' }));
    await screen.findByText('Entidades a resolver');

    fireEvent.click(screen.getByRole('button', { name: '+ CRIAR NOVO GRUPO' }));
    expect(screen.getByText('Novo grupo comparável')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'CRIAR GRUPO' }));
    expect(await screen.findByText('Informe o nome do grupo.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nome do novo grupo'), { target: { value: ' grupo existente ' } });
    fireEvent.click(screen.getByRole('button', { name: 'CRIAR GRUPO' }));
    expect(await screen.findByText('Já existe um grupo com esse nome neste projeto.')).toBeInTheDocument();
    expect(enviar.mock.calls.filter(([caminho]) => caminho === '/grupos')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'USAR GRUPO EXISTENTE' }));
    expect(screen.getByLabelText('Grupo para criar todas as entidades')).toHaveValue('21');

    fireEvent.click(screen.getByRole('button', { name: '+ CRIAR NOVO GRUPO' }));
    fireEvent.change(screen.getByLabelText('Nome do novo grupo'), { target: { value: 'Novo grupo' } });
    fireEvent.change(screen.getByLabelText('Descrição do novo grupo'), { target: { value: 'Descrição' } });
    fireEvent.click(screen.getByRole('button', { name: 'CRIAR GRUPO' }));
    await waitFor(() => expect(enviar).toHaveBeenCalledWith('/grupos', { projeto_id: 1, nome: 'Novo grupo', descricao: 'Descrição', ativo: true }));
    expect(await screen.findByText('Grupo criado e selecionado.')).toBeInTheDocument();
    expect(screen.getByLabelText('Grupo para criar todas as entidades')).toHaveValue('23');
    expect(within(screen.getByLabelText('Grupo para criar todas as entidades')).getByRole('option', { name: 'Novo grupo' })).toBeInTheDocument();
    expect(screen.getByLabelText('Código do novo indicador da coluna produtividade')).toHaveValue('PROD');
    expect(within(screen.getByLabelText('Grupo para criar todas as entidades')).queryByRole('option', { name: 'Grupo inativo' })).not.toBeInTheDocument();
  });

  it('impede duplicata de grupo inativo e preserva o formulário', async () => {
    obter.mockImplementation((caminho) => caminho.startsWith('/grupos')
      ? Promise.resolve([{ id: 22, nome: 'Grupo arquivado', ativo: false }])
      : Promise.resolve([]));
    let validacoes = 0;
    enviar.mockImplementation((caminho) => {
      if (caminho === '/importacoes') return Promise.resolve({ id: 9, tipo_arquivo: 'CSV', nome_arquivo_original: 'dados.csv', inspecao: { sugestao_delimitador: ';', preview: [['codigo', 'periodo'], ['U01', '01/2026']] } });
      if (caminho.includes('/validar')) { validacoes += 1; return Promise.resolve({ quantidade_erros: 1, quantidade_alertas: 0, linhas_lidas: 1, observacoes_a_criar: 0, status: 'COM_ERROS', erros: [{ tipo: 'ENTIDADE_DESCONHECIDA', valor_original: 'U01', linha: 2 }], alertas: [] }); }
      return Promise.reject(new Error('Falha amigável ao criar grupo.'));
    });
    render(<ImportacoesPage />);
    const campoArquivo = await screen.findByLabelText('Arquivo de dados');
    fireEvent.change(campoArquivo, { target: { files: [new File(['codigo;periodo'], 'dados.csv')] } });
    fireEvent.submit(campoArquivo.closest('form'));
    await screen.findByText('Mapeie as colunas');
    fireEvent.click(screen.getByRole('button', { name: 'VALIDAR SEM GRAVAR' }));
    await screen.findByText('Nenhum grupo disponível para estas entidades.');
    fireEvent.click(screen.getByRole('button', { name: 'CRIAR PRIMEIRO GRUPO' }));
    fireEvent.change(screen.getByLabelText('Nome do novo grupo'), { target: { value: ' grupo arquivado ' } });
    fireEvent.click(screen.getByRole('button', { name: 'CRIAR GRUPO' }));
    expect(await screen.findByText('Já existe um grupo inativo com esse nome.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'USAR GRUPO EXISTENTE' })).not.toBeInTheDocument();
    expect(enviar.mock.calls.filter(([caminho]) => caminho === '/grupos')).toHaveLength(0);

    fireEvent.change(screen.getByLabelText('Nome do novo grupo'), { target: { value: 'Grupo com falha' } });
    fireEvent.click(screen.getByRole('button', { name: 'CRIAR GRUPO' }));
    expect(await screen.findByText('Falha amigável ao criar grupo.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome do novo grupo')).toHaveValue('Grupo com falha');
    expect(screen.getByText('Entidades a resolver')).toBeInTheDocument();
    expect(validacoes).toBe(1);
  });
});
