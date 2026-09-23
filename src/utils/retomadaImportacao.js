import { criarDadosNovoIndicador, SELECAO_INDICADOR_EXISTENTE, SELECAO_INDICADOR_NOVO } from './mapeamentoImportacao';

export const CONFIGURACAO_INICIAL_IMPORTACAO = {
  linha_inicial: 2,
  linhas_cabecalho: [1],
  delimitador: ';',
  aba: '',
  formato_periodo: 'MM/AAAA',
  separador_decimal: ',',
  separador_milhar: '.',
  percentual_como: 'FRACAO',
};

export function restaurarConfiguracaoImportacao(persistida = {}, inspecao = {}, tipoArquivo = 'CSV') {
  persistida = persistida || {};
  const numerico = persistida.formato_numerico || {};
  const sugestaoAba = inspecao.abas?.[0]?.nome || '';
  return {
    ...CONFIGURACAO_INICIAL_IMPORTACAO,
    linha_inicial: persistida.linha_inicial ?? CONFIGURACAO_INICIAL_IMPORTACAO.linha_inicial,
    linhas_cabecalho: persistida.linhas_cabecalho || CONFIGURACAO_INICIAL_IMPORTACAO.linhas_cabecalho,
    delimitador: persistida.delimitador || inspecao.sugestao_delimitador || CONFIGURACAO_INICIAL_IMPORTACAO.delimitador,
    aba: persistida.aba || (tipoArquivo === 'XLSX' ? sugestaoAba : ''),
    formato_periodo: persistida.formato_periodo || CONFIGURACAO_INICIAL_IMPORTACAO.formato_periodo,
    separador_decimal: numerico.separador_decimal || CONFIGURACAO_INICIAL_IMPORTACAO.separador_decimal,
    separador_milhar: numerico.separador_milhar || CONFIGURACAO_INICIAL_IMPORTACAO.separador_milhar,
    percentual_como: numerico.percentual_como || CONFIGURACAO_INICIAL_IMPORTACAO.percentual_como,
  };
}

export function restaurarMapeamentosImportacao(mapeamento = {}, cabecalhos = []) {
  return (mapeamento.colunas || []).map((coluna) => {
    const indicador = coluna.indicador || {};
    const nome = String(cabecalhos[coluna.indice_coluna - 1] || `Coluna ${coluna.indice_coluna}`);
    let selecao = coluna.papel || 'IGNORAR';
    if (coluna.papel === 'VALOR_INDICADOR' && indicador.acao === 'EXISTENTE') selecao = SELECAO_INDICADOR_EXISTENTE;
    if (coluna.papel === 'VALOR_INDICADOR' && indicador.acao === 'CRIAR') selecao = SELECAO_INDICADOR_NOVO;
    return {
      indice_coluna: coluna.indice_coluna,
      nome,
      selecao,
      candidata_metrica: coluna.papel === 'VALOR_INDICADOR' || selecao === 'IGNORAR',
      indicador_existente_id: indicador.indicador_id != null ? String(indicador.indicador_id) : '',
      novo_indicador: {
        ...criarDadosNovoIndicador(nome),
        ...indicador.dados,
        peso_percentual: indicador.dados?.peso_percentual ?? '',
      },
    };
  });
}

export function restaurarDecisoesEntidades(decisoes = {}) {
  return Object.fromEntries(Object.entries(decisoes).map(([codigo, decisao]) => [codigo, {
    ...decisao,
    grupo_id: decisao.grupo_id != null ? String(decisao.grupo_id) : undefined,
    entidade_id: decisao.entidade_id != null ? String(decisao.entidade_id) : undefined,
  }]));
}
