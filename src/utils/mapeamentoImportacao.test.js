import { describe, expect, it } from 'vitest';
import {
  calcularPesoPlanejado,
  criarDadosNovoIndicador,
  montarColunasDoPayload,
  resumirMetricas,
  SELECAO_INDICADOR_EXISTENTE,
  SELECAO_INDICADOR_NOVO,
  sugerirNomeIndicador,
  validarIndicadoresMapeados,
} from './mapeamentoImportacao';

describe('mapeamento de indicadores da importação', () => {
  it('mantém uma coluna explicitamente ignorada', () => {
    expect(montarColunasDoPayload([{ indice_coluna: 3, selecao: 'IGNORAR' }])).toEqual([
      { indice_coluna: 3, papel: 'IGNORAR' },
    ]);
  });

  it('monta o contrato de associação com indicador existente', () => {
    expect(montarColunasDoPayload([{
      indice_coluna: 3,
      selecao: SELECAO_INDICADOR_EXISTENTE,
      indicador_existente_id: '12',
    }])).toEqual([{
      indice_coluna: 3,
      papel: 'VALOR_INDICADOR',
      indicador: { acao: 'EXISTENTE', indicador_id: 12 },
    }]);
  });

  it('monta exatamente o contrato de criação atômica do backend', () => {
    expect(montarColunasDoPayload([{
      indice_coluna: 4,
      selecao: SELECAO_INDICADOR_NOVO,
      novo_indicador: {
        codigo: ' QUAL ',
        nome: ' Qualidade ',
        unidade_medida: ' % ',
        direcao: 'MAIOR_MELHOR',
        peso_percentual: '35',
        obrigatorio: true,
        participa_global_score: true,
      },
    }])).toEqual([{
      indice_coluna: 4,
      papel: 'VALOR_INDICADOR',
      indicador: {
        acao: 'CRIAR',
        dados: {
          codigo: 'QUAL',
          nome: 'Qualidade',
          unidade_medida: '%',
          direcao: 'MAIOR_MELHOR',
          peso_percentual: 35,
          obrigatorio: true,
          participa_global_score: true,
        },
      },
    }]);
  });

  it('valida os campos obrigatórios e o intervalo do peso', () => {
    const erros = validarIndicadoresMapeados([{
      indice_coluna: 5,
      selecao: SELECAO_INDICADOR_NOVO,
      novo_indicador: {
        codigo: '', nome: '', unidade_medida: '', direcao: '', peso_percentual: '101',
      },
    }]);

    expect(erros[5]).toEqual([
      'Informe o código.',
      'Informe o nome.',
      'Informe a unidade de medida.',
      'Selecione a direção.',
      'Informe um peso entre 0 e 100.',
    ]);
  });

  it('exige a seleção do indicador na opção de associação', () => {
    expect(validarIndicadoresMapeados([{
      indice_coluna: 3,
      selecao: SELECAO_INDICADOR_EXISTENTE,
      indicador_existente_id: '',
    }])).toEqual({ 3: ['Selecione o indicador que corresponde a esta coluna.'] });
  });

  it('sugere somente o nome legível e mantém decisões gerenciais vazias', () => {
    expect(sugerirNomeIndicador('prazo_medio')).toBe('Prazo médio');
    expect(criarDadosNovoIndicador('prazo_medio')).toMatchObject({
      codigo: '',
      nome: 'Prazo médio',
      unidade_medida: '',
      direcao: '',
      peso_percentual: '',
    });
  });

  it('resume as escolhas reais e soma pesos existentes com novos', () => {
    const indicadores = [{
      id: 8, codigo: 'QUAL', nome: 'Qualidade', ativo: true,
      unidade_medida: '%', direcao: 'MAIOR_MELHOR', peso_percentual: 40,
      participa_global_score: true,
    }];
    const mapeamentos = [
      { indice_coluna: 3, nome: 'qualidade', candidata_metrica: true, selecao: SELECAO_INDICADOR_EXISTENTE, indicador_existente_id: '8' },
      { indice_coluna: 4, nome: 'prazo_medio', candidata_metrica: true, selecao: SELECAO_INDICADOR_NOVO, novo_indicador: { codigo: 'PRAZO', nome: 'Prazo médio', peso_percentual: '35', participa_global_score: true } },
      { indice_coluna: 5, nome: 'comentario', candidata_metrica: true, selecao: 'IGNORAR' },
    ];

    expect(resumirMetricas(mapeamentos, indicadores)).toMatchObject({
      total: 3, associados: 1, novos: 1, ignorados: 1,
    });
    expect(calcularPesoPlanejado(indicadores, mapeamentos)).toBe(75);
  });
});
