import { describe, expect, it } from 'vitest';
import { agruparEntidadesDesconhecidas, aplicarCriacaoEmLote, montarDecisoesEntidades } from './entidadesImportacao';

describe('resolução de entidades na importação', () => {
  it('agrupa erros repetidos por código e conta as linhas afetadas', () => {
    const erros = Array.from({ length: 6 }, (_, indice) => ({ tipo: 'ENTIDADE_DESCONHECIDA', valor_original: 'U01', linha: indice + 2 }));
    erros.push({ tipo: 'ENTIDADE_DESCONHECIDA', valor_original: 'U02', linha: 8 });
    expect(agruparEntidadesDesconhecidas(erros)).toEqual([
      { codigo: 'U01', quantidade_linhas: 6, linhas: [2, 3, 4, 5, 6, 7] },
      { codigo: 'U02', quantidade_linhas: 1, linhas: [8] },
    ]);
  });

  it('monta o contrato das três decisões sem campos internos da interface', () => {
    expect(montarDecisoesEntidades({
      U01: { acao: 'CRIAR', grupo_id: '7', nome: ' Unidade 01 ' },
      U02: { acao: 'ASSOCIAR', entidade_id: '12' },
      U03: { acao: 'IGNORAR' },
    })).toEqual({
      U01: { acao: 'CRIAR', grupo_id: 7, nome: 'Unidade 01' },
      U02: { acao: 'ASSOCIAR', entidade_id: 12 },
      U03: { acao: 'IGNORAR' },
    });
  });

  it('aplica criação em lote somente aos códigos ainda sem decisão', () => {
    const resultado = aplicarCriacaoEmLote(
      [{ codigo: 'U01' }, { codigo: 'U02' }],
      { U01: { acao: 'IGNORAR' } },
      '4',
    );
    expect(resultado).toEqual({ U01: { acao: 'IGNORAR' }, U02: { acao: 'CRIAR', grupo_id: '4', nome: '' } });
  });
});
