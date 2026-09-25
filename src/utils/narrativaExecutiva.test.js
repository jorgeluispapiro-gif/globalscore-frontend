import { describe, expect, it } from 'vitest';
import { construirNotaExecutiva } from './narrativaExecutiva';

describe('nota executiva factual', () => {
  it('descreve SUBIU, CAIU, ESTAVEL e SEM_COMPARACAO sem inferir causalidade', () => {
    expect(construirNotaExecutiva({ global_score_atual: 76, variacao_absoluta: 6, tendencia: 'SUBIU' }, 1)).toEqual([
      'Global Score de 76,0 no período, 6,0 pontos acima da avaliação anterior.',
      'No mesmo período, há 1 evento gerencial registrado.',
    ]);
    expect(construirNotaExecutiva({ global_score_atual: 68, variacao_absoluta: -4, tendencia: 'CAIU' })).toEqual([
      'Global Score de 68,0 no período, 4,0 pontos abaixo da avaliação anterior.',
    ]);
    expect(construirNotaExecutiva({ global_score_atual: 74.5, variacao_absoluta: 0, tendencia: 'ESTAVEL' })).toEqual([
      'Global Score manteve-se em 74,5 em relação à avaliação anterior.',
    ]);
    expect(construirNotaExecutiva({ global_score_atual: 72, variacao_absoluta: null, tendencia: 'SEM_COMPARACAO' })).toEqual([
      'Global Score de 72,0 no período. Este é o primeiro resultado disponível nesta Base de Referência.',
    ]);
  });
});
