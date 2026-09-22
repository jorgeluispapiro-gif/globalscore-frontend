import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('planeja um novo indicador sem persistir antes da confirmação', async () => {
    render(<ImportacoesPage />);
    await waitFor(() => expect(obter).toHaveBeenCalledWith('/indicadores?projeto_id=1'));

    const arquivo = new File(['codigo;periodo;produtividade'], 'dados.csv', { type: 'text/csv' });
    const campoArquivo = screen.getByLabelText('Arquivo de dados');
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
    const campoArquivo = screen.getByLabelText('Arquivo de dados');
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
});
