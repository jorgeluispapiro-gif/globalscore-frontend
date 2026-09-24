import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportacoesPage } from './ImportacoesPage';

const { obter, enviar } = vi.hoisted(() => ({ obter: vi.fn(), enviar: vi.fn() }));

vi.mock('../hooks/useProjeto', () => ({
  useProjeto: () => ({ projeto: { id: 1, nome: 'Projeto teste' }, projetoId: '1' }),
}));

vi.mock('../services/api', () => ({ api: { get: obter, post: enviar } }));

const inspecao = {
  sugestao_delimitador: ';',
  preview: [
    ['codigo', 'periodo', 'vendas'],
    ['U01', '02/2026', '110'],
  ],
};

const loteEnviado = {
  id: 9,
  projeto_id: 1,
  tipo_arquivo: 'CSV',
  nome_arquivo_original: 'fevereiro.csv',
  status: 'ANALISADA',
  inspecao,
};

const configuracaoLeitura = {
  linha_inicial: 2,
  linhas_cabecalho: [1],
  colunas_utilizadas: [1, 2, 3],
  delimitador: ';',
  formato_periodo: 'MM/AAAA',
  formato_numerico: {
    separador_decimal: ',',
    separador_milhar: '.',
    percentual_como: 'FRACAO',
  },
};

const mapeamento = {
  formato: 'LARGO',
  colunas: [
    { indice_coluna: 1, papel: 'CODIGO_ENTIDADE' },
    { indice_coluna: 2, papel: 'PERIODO' },
    {
      indice_coluna: 3,
      papel: 'VALOR_INDICADOR',
      indicador: { acao: 'EXISTENTE', indicador_id: 7 },
    },
  ],
  decisoes_entidades: {},
};

const loteComDiferencas = {
  ...loteEnviado,
  nome_arquivo_original: 'fevereiro-alterado.csv',
  inspecao: {
    sugestao_delimitador: ';',
    preview: [
      ['periodo', 'codigo', 'vendas', 'qualidade'],
      ['02/2026', 'U01', '110', '95'],
    ],
  },
};

const reconhecimentoComDiferencas = {
  resultado: 'COMPATIVEL_COM_DIFERENCAS',
  perfil_sugerido: { id: 4, nome: 'Importação mensal', versao: 1 },
  diferencas: [
    { tipo: 'COLUNA_NOVA', indice_coluna: 4, nome: 'qualidade' },
    { tipo: 'COLUNA_REMOVIDA', indice_coluna: 4, nome: 'regiao' },
    { tipo: 'ORDEM_ALTERADA' },
  ],
  configuracao_leitura_sugerida: configuracaoLeitura,
  mapeamento_sugerido: {
    formato: 'LARGO',
    colunas: [
      { indice_coluna: 1, papel: 'PERIODO' },
      { indice_coluna: 2, papel: 'CODIGO_ENTIDADE' },
      {
        indice_coluna: 3,
        papel: 'VALOR_INDICADOR',
        indicador: { acao: 'EXISTENTE', indicador_id: 7 },
      },
    ],
    decisoes_entidades: {},
  },
};

async function selecionarArquivo() {
  const campo = await screen.findByLabelText('Arquivo de dados');
  fireEvent.change(campo, {
    target: { files: [new File(['codigo;periodo;vendas'], 'fevereiro.csv')] },
  });
  await act(async () => fireEvent.submit(campo.closest('form')));
}

describe('importação incremental exata', () => {
  beforeEach(() => {
    obter.mockReset();
    enviar.mockReset();
    obter.mockImplementation((caminho) => caminho.startsWith('/indicadores')
      ? Promise.resolve([{
        id: 7,
        codigo: 'VENDAS',
        nome: 'Vendas',
        unidade_medida: 'R$',
        direcao: 'MAIOR_MELHOR',
        peso_percentual: 100,
        participa_global_score: true,
        ativo: true,
      }])
      : Promise.resolve([]));
  });

  it('salva opcionalmente uma configuração depois da confirmação', async () => {
    enviar.mockImplementation((caminho) => {
      if (caminho === '/importacoes') return Promise.resolve(loteEnviado);
      if (caminho.endsWith('/reconhecer-perfil')) {
        return Promise.resolve({ resultado: 'INCOMPATIVEL', perfil_sugerido: null });
      }
      if (caminho.endsWith('/validar')) {
        return Promise.resolve({
          quantidade_erros: 0,
          quantidade_alertas: 0,
          linhas_lidas: 1,
          observacoes_a_criar: 1,
          entidades_reconhecidas: 1,
          novas_entidades: [],
          erros: [],
          alertas: [],
          status: 'VALIDADA',
        });
      }
      if (caminho.endsWith('/confirmar')) {
        return Promise.resolve({
          id: 9,
          status: 'CONCLUIDA',
          observacoes_criadas: 1,
          nome_arquivo_original: 'fevereiro.csv',
        });
      }
      if (caminho === '/perfis-importacao') {
        return Promise.resolve({ id: 4, nome: 'Importação mensal', versao: 1 });
      }
      return Promise.resolve({});
    });

    render(<ImportacoesPage />);
    await selecionarArquivo();
    await act(async () => fireEvent.click(await screen.findByRole('button', { name: 'VALIDAR SEM GRAVAR' })));
    await act(async () => fireEvent.click(await screen.findByRole('button', { name: 'CONFIRMAR IMPORTAÇÃO' })));
    fireEvent.click(await screen.findByRole('button', { name: 'SALVAR CONFIGURAÇÃO' }));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'SALVAR' })));
    expect(await screen.findByText('Informe o nome da configuração.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Nome da configuração'), {
      target: { value: 'Importação mensal' },
    });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'SALVAR' })));

    await waitFor(() => expect(enviar).toHaveBeenCalledWith('/perfis-importacao', {
      importacao_id: 9,
      nome: 'Importação mensal',
    }));
    expect(await screen.findByText('Configuração salva para próximas importações.')).toBeInTheDocument();
  });

  it('aplica perfil compatível e chega ao dry-run sem remapeamento manual', async () => {
    enviar.mockImplementation((caminho, dados) => {
      if (caminho === '/importacoes') return Promise.resolve(loteEnviado);
      if (caminho.endsWith('/reconhecer-perfil')) {
        return Promise.resolve({
          resultado: 'COMPATIVEL',
          perfil_sugerido: { id: 4, nome: 'Importação mensal', versao: 1 },
        });
      }
      if (caminho.endsWith('/aplicar-perfil')) {
        expect(dados).toEqual({ perfil_id: 4 });
        return Promise.resolve({
          resultado: 'APLICADO',
          importacao: {
            ...loteEnviado,
            inspecao: undefined,
            perfil_importacao_id: 4,
            configuracao_leitura: configuracaoLeitura,
            mapeamento,
          },
        });
      }
      if (caminho.endsWith('/validar')) {
        expect(dados).toEqual({
          configuracao_leitura: configuracaoLeitura,
          mapeamento,
        });
        return Promise.resolve({
          quantidade_erros: 0,
          quantidade_alertas: 0,
          linhas_lidas: 1,
          observacoes_a_criar: 1,
          entidades_reconhecidas: 1,
          novas_entidades: [],
          erros: [],
          alertas: [],
          status: 'VALIDADA',
        });
      }
      return Promise.resolve({});
    });

    render(<ImportacoesPage />);
    await selecionarArquivo();
    expect(await screen.findByText('Configuração conhecida encontrada')).toBeInTheDocument();
    expect(screen.queryByText('Mapeie as colunas')).not.toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'USAR CONFIGURAÇÃO' })));

    expect(await screen.findByText('Resultado da validação')).toBeInTheDocument();
    expect(screen.getByText('Configuração aplicada e validação concluída.')).toBeInTheDocument();
    expect(screen.queryByText('Mapeie as colunas')).not.toBeInTheDocument();
    expect(enviar.mock.calls.some(([caminho]) => caminho.endsWith('/aplicar-perfil'))).toBe(true);
    expect(enviar.mock.calls.some(([caminho]) => caminho.endsWith('/validar'))).toBe(true);
  });

  it('não oferece salvar configuração quando a importação concluída já usou um perfil', async () => {
    enviar.mockImplementation((caminho) => {
      if (caminho === '/importacoes') return Promise.resolve(loteEnviado);
      if (caminho.endsWith('/reconhecer-perfil')) {
        return Promise.resolve({
          resultado: 'COMPATIVEL',
          perfil_sugerido: { id: 4, nome: 'Importação mensal', versao: 1 },
        });
      }
      if (caminho.endsWith('/aplicar-perfil')) {
        return Promise.resolve({
          resultado: 'APLICADO',
          importacao: {
            ...loteEnviado,
            perfil_importacao_id: 4,
            configuracao_leitura: configuracaoLeitura,
            mapeamento,
          },
        });
      }
      if (caminho.endsWith('/validar')) {
        return Promise.resolve({
          quantidade_erros: 0,
          quantidade_alertas: 0,
          linhas_lidas: 1,
          observacoes_a_criar: 1,
          entidades_reconhecidas: 1,
          novas_entidades: [],
          erros: [],
          alertas: [],
          status: 'VALIDADA',
        });
      }
      if (caminho.endsWith('/confirmar')) {
        return Promise.resolve({
          id: 9,
          status: 'CONCLUIDA',
          observacoes_criadas: 1,
          nome_arquivo_original: 'fevereiro.csv',
          perfil_importacao_id: 4,
        });
      }
      return Promise.resolve({});
    });

    render(<ImportacoesPage />);
    await selecionarArquivo();
    await act(async () => fireEvent.click(await screen.findByRole('button', { name: 'USAR CONFIGURAÇÃO' })));
    await act(async () => fireEvent.click(await screen.findByRole('button', { name: 'CONFIRMAR IMPORTAÇÃO' })));

    expect(await screen.findByText('Importação concluída')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'SALVAR CONFIGURAÇÃO' })).not.toBeInTheDocument();
  });

  it('mantém o mapeamento manual quando a estrutura é incompatível', async () => {
    enviar.mockImplementation((caminho) => {
      if (caminho === '/importacoes') return Promise.resolve(loteEnviado);
      if (caminho.endsWith('/reconhecer-perfil')) {
        return Promise.resolve({ resultado: 'INCOMPATIVEL', perfil_sugerido: null });
      }
      return Promise.resolve({});
    });

    render(<ImportacoesPage />);
    await selecionarArquivo();
    expect(await screen.findByText('Mapeie as colunas')).toBeInTheDocument();
    expect(screen.getByLabelText('Mapeamento da coluna vendas')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'USAR CONFIGURAÇÃO' })).not.toBeInTheDocument();
    expect(enviar.mock.calls.some(([caminho]) => caminho.endsWith('/aplicar-perfil'))).toBe(false);
  });

  it('mostra as diferenças e reaproveita somente os mapeamentos seguros', async () => {
    enviar.mockImplementation((caminho) => {
      if (caminho === '/importacoes') return Promise.resolve(loteComDiferencas);
      if (caminho.endsWith('/reconhecer-perfil')) return Promise.resolve(reconhecimentoComDiferencas);
      return Promise.resolve({});
    });

    render(<ImportacoesPage />);
    await selecionarArquivo();
    expect(await screen.findByText('Configuração conhecida com alterações')).toBeInTheDocument();
    expect(screen.getByText('Importação mensal')).toBeInTheDocument();
    expect(screen.getByText('Nova coluna no arquivo: qualidade')).toBeInTheDocument();
    expect(screen.getByText('Coluna existente na configuração não está mais presente: regiao')).toBeInTheDocument();
    expect(screen.getByText('Ordem das colunas mudou')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'REVISAR E REAPROVEITAR' }));
    expect(await screen.findByText('Revise o mapeamento')).toBeInTheDocument();
    expect(screen.getByLabelText('Mapeamento da coluna periodo')).toHaveValue('PERIODO');
    expect(screen.getByLabelText('Mapeamento da coluna codigo')).toHaveValue('CODIGO_ENTIDADE');
    expect(screen.getByLabelText('Mapeamento da coluna vendas')).toHaveValue('ASSOCIAR_INDICADOR');
    expect(screen.getByLabelText('Indicador existente da coluna vendas')).toHaveValue('7');
    expect(enviar.mock.calls.some(([caminho]) => caminho.endsWith('/aplicar-perfil'))).toBe(false);
  });

  it('mantém coluna nova pendente e bloqueia a validação até a decisão', async () => {
    enviar.mockImplementation((caminho) => {
      if (caminho === '/importacoes') return Promise.resolve(loteComDiferencas);
      if (caminho.endsWith('/reconhecer-perfil')) return Promise.resolve(reconhecimentoComDiferencas);
      if (caminho.endsWith('/validar')) {
        return Promise.resolve({
          quantidade_erros: 0,
          quantidade_alertas: 0,
          linhas_lidas: 1,
          observacoes_a_criar: 2,
          entidades_reconhecidas: 1,
          novas_entidades: [],
          erros: [],
          alertas: [],
          status: 'VALIDADA',
        });
      }
      return Promise.resolve({});
    });

    render(<ImportacoesPage />);
    await selecionarArquivo();
    fireEvent.click(await screen.findByRole('button', { name: 'REVISAR E REAPROVEITAR' }));
    const seletorQualidade = screen.getByLabelText('Mapeamento da coluna qualidade');
    expect(seletorQualidade).toHaveValue('');
    expect(screen.getByText('Coluna 4 · Pendente')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'VALIDAR SEM GRAVAR' }));
    expect(await screen.findByText('Selecione a função desta coluna.')).toBeInTheDocument();
    expect(enviar.mock.calls.filter(([caminho]) => caminho.endsWith('/validar'))).toHaveLength(0);

    fireEvent.change(seletorQualidade, { target: { value: 'IGNORAR' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'VALIDAR SEM GRAVAR' })));
    await waitFor(() => expect(enviar.mock.calls.filter(([caminho]) => caminho.endsWith('/validar'))).toHaveLength(1));
    const payload = enviar.mock.calls.find(([caminho]) => caminho.endsWith('/validar'))[1];
    expect(payload.configuracao_leitura.colunas_utilizadas).toEqual([1, 2, 3, 4]);
    expect(payload.mapeamento.colunas).toContainEqual({ indice_coluna: 4, papel: 'IGNORAR' });
  });

  it('mapeia do zero no mesmo lote sem aplicar o perfil parcial', async () => {
    enviar.mockImplementation((caminho) => {
      if (caminho === '/importacoes') return Promise.resolve(loteComDiferencas);
      if (caminho.endsWith('/reconhecer-perfil')) return Promise.resolve(reconhecimentoComDiferencas);
      return Promise.resolve({});
    });

    render(<ImportacoesPage />);
    await selecionarArquivo();
    fireEvent.click(await screen.findByRole('button', { name: 'MAPEAR DO ZERO' }));

    expect(await screen.findByText('Mapeie as colunas')).toBeInTheDocument();
    expect(screen.getByText('fevereiro-alterado.csv')).toBeInTheDocument();
    expect(screen.getByLabelText('Mapeamento da coluna periodo')).toHaveValue('PERIODO');
    expect(screen.getByLabelText('Mapeamento da coluna qualidade')).toHaveValue('IGNORAR');
    expect(enviar.mock.calls.filter(([caminho]) => caminho === '/importacoes')).toHaveLength(1);
    expect(enviar.mock.calls.some(([caminho]) => caminho.endsWith('/aplicar-perfil'))).toBe(false);
  });
});
