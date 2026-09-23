import { describe, expect, it } from 'vitest';
import { restaurarConfiguracaoImportacao, restaurarDecisoesEntidades, restaurarMapeamentosImportacao } from './retomadaImportacao';

describe('retomada da importação', () => {
  it('restaura a configuração persistida sem substituir por sugestões', () => {
    expect(restaurarConfiguracaoImportacao({
      linha_inicial: 4,
      linhas_cabecalho: [2, 3],
      delimitador: '|',
      formato_periodo: 'AAAA-MM',
      formato_numerico: { separador_decimal: '.', separador_milhar: ',', percentual_como: 'NUMERO' },
    }, { sugestao_delimitador: ';' }, 'CSV')).toMatchObject({
      linha_inicial: 4,
      linhas_cabecalho: [2, 3],
      delimitador: '|',
      formato_periodo: 'AAAA-MM',
      separador_decimal: '.',
      separador_milhar: ',',
      percentual_como: 'NUMERO',
    });
  });

  it('restaura indicadores existentes e novos com todos os dados gerenciais', () => {
    const resultado = restaurarMapeamentosImportacao({ colunas: [
      { indice_coluna: 1, papel: 'CODIGO_ENTIDADE' },
      { indice_coluna: 2, papel: 'VALOR_INDICADOR', indicador: { acao: 'EXISTENTE', indicador_id: 8 } },
      { indice_coluna: 3, papel: 'VALOR_INDICADOR', indicador: { acao: 'CRIAR', dados: { codigo: 'NOVO', nome: 'Novo indicador', unidade_medida: '%', direcao: 'MAIOR_MELHOR', peso_percentual: 35, obrigatorio: false, participa_global_score: true } } },
    ] }, ['codigo', 'existente', 'novo']);
    expect(resultado[1]).toMatchObject({ selecao: 'ASSOCIAR_INDICADOR', indicador_existente_id: '8' });
    expect(resultado[2]).toMatchObject({ selecao: 'CRIAR_INDICADOR', novo_indicador: { codigo: 'NOVO', nome: 'Novo indicador', unidade_medida: '%', direcao: 'MAIOR_MELHOR', peso_percentual: 35, obrigatorio: false, participa_global_score: true } });
  });

  it('restaura as três decisões de entidades com ids adequados aos seletores', () => {
    expect(restaurarDecisoesEntidades({
      U01: { acao: 'CRIAR', grupo_id: 3, nome: 'Unidade 1' },
      U02: { acao: 'ASSOCIAR', entidade_id: 14 },
      U03: { acao: 'IGNORAR' },
    })).toEqual({
      U01: { acao: 'CRIAR', grupo_id: '3', nome: 'Unidade 1', entidade_id: undefined },
      U02: { acao: 'ASSOCIAR', grupo_id: undefined, entidade_id: '14' },
      U03: { acao: 'IGNORAR', grupo_id: undefined, entidade_id: undefined },
    });
  });
});
