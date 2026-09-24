export const SELECAO_INDICADOR_EXISTENTE = 'ASSOCIAR_INDICADOR';
export const SELECAO_INDICADOR_NOVO = 'CRIAR_INDICADOR';

export function sugerirNomeIndicador(nomeColuna) {
  const nome = String(nomeColuna || '')
    .trim()
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR')
    .replace(/\bmedio\b/g, 'médio')
    .replace(/\bunitario\b/g, 'unitário');
  return nome ? nome.charAt(0).toLocaleUpperCase('pt-BR') + nome.slice(1) : '';
}

export function criarDadosNovoIndicador(nomeColuna) {
  return {
    codigo: '',
    nome: sugerirNomeIndicador(nomeColuna),
    unidade_medida: '',
    direcao: '',
    peso_percentual: '',
    participa_global_score: true,
    obrigatorio: true,
  };
}

export function validarIndicadoresMapeados(mapeamentos) {
  const erros = {};

  for (const item of mapeamentos) {
    if (!item.selecao) {
      erros[item.indice_coluna] = ['Selecione a função desta coluna.'];
      continue;
    }

    if (item.selecao === SELECAO_INDICADOR_EXISTENTE && !item.indicador_existente_id) {
      erros[item.indice_coluna] = ['Selecione o indicador que corresponde a esta coluna.'];
    }

    if (item.selecao === SELECAO_INDICADOR_NOVO) {
      const dados = item.novo_indicador || {};
      const errosColuna = [];
      if (!String(dados.codigo || '').trim()) errosColuna.push('Informe o código.');
      if (!String(dados.nome || '').trim()) errosColuna.push('Informe o nome.');
      if (!String(dados.unidade_medida || '').trim()) errosColuna.push('Informe a unidade de medida.');
      if (!['MAIOR_MELHOR', 'MENOR_MELHOR'].includes(dados.direcao)) errosColuna.push('Selecione a direção.');

      const peso = Number(dados.peso_percentual);
      if (dados.peso_percentual === '' || !Number.isFinite(peso) || peso < 0 || peso > 100) {
        errosColuna.push('Informe um peso entre 0 e 100.');
      }
      if (errosColuna.length) erros[item.indice_coluna] = errosColuna;
    }
  }

  return erros;
}

export function montarColunasDoPayload(mapeamentos) {
  return mapeamentos.map((item) => {
    if (item.selecao === SELECAO_INDICADOR_EXISTENTE) {
      return {
        indice_coluna: item.indice_coluna,
        papel: 'VALOR_INDICADOR',
        indicador: {
          acao: 'EXISTENTE',
          indicador_id: Number(item.indicador_existente_id),
        },
      };
    }

    if (item.selecao === SELECAO_INDICADOR_NOVO) {
      const dados = item.novo_indicador;
      return {
        indice_coluna: item.indice_coluna,
        papel: 'VALOR_INDICADOR',
        indicador: {
          acao: 'CRIAR',
          dados: {
            codigo: dados.codigo.trim(),
            nome: dados.nome.trim(),
            unidade_medida: dados.unidade_medida.trim(),
            direcao: dados.direcao,
            peso_percentual: Number(dados.peso_percentual),
            obrigatorio: Boolean(dados.obrigatorio),
            participa_global_score: Boolean(dados.participa_global_score),
          },
        },
      };
    }

    return { indice_coluna: item.indice_coluna, papel: item.selecao };
  });
}

export function resumirMetricas(mapeamentos, indicadores) {
  const papeisEstruturais = new Set(['CODIGO_ENTIDADE', 'NOME_ENTIDADE', 'PERIODO']);
  const metricas = mapeamentos.filter((item) => (
    (item.candidata_metrica && !papeisEstruturais.has(item.selecao))
    || item.selecao === SELECAO_INDICADOR_EXISTENTE
    || item.selecao === SELECAO_INDICADOR_NOVO
  ));
  const existentes = metricas.filter((item) => item.selecao === SELECAO_INDICADOR_EXISTENTE);
  const novos = metricas.filter((item) => item.selecao === SELECAO_INDICADOR_NOVO);
  const ignorados = metricas.filter((item) => item.selecao === 'IGNORAR');
  const pendentes = metricas.filter((item) => !item.selecao);
  const detalhes = metricas.map((item) => {
    if (item.selecao === SELECAO_INDICADOR_EXISTENTE) {
      const indicador = indicadores.find((registro) => String(registro.id) === String(item.indicador_existente_id));
      return { indice_coluna: item.indice_coluna, coluna: item.nome, descricao: indicador ? `${indicador.codigo} · ${indicador.nome} · existente` : 'Selecione um indicador existente' };
    }
    if (item.selecao === SELECAO_INDICADOR_NOVO) {
      const dados = item.novo_indicador || {};
      return { indice_coluna: item.indice_coluna, coluna: item.nome, descricao: `${dados.codigo || 'Sem código'} · ${dados.nome || 'Sem nome'} · novo` };
    }
    if (!item.selecao) {
      return { indice_coluna: item.indice_coluna, coluna: item.nome, descricao: 'pendente de decisão' };
    }
    return { indice_coluna: item.indice_coluna, coluna: item.nome, descricao: 'ignorada' };
  });

  return { total: metricas.length, associados: existentes.length, novos: novos.length, ignorados: ignorados.length, pendentes: pendentes.length, detalhes };
}

export function calcularPesoPlanejado(indicadores, mapeamentos) {
  const pesoExistente = indicadores
    .filter((item) => item.ativo === true && item.participa_global_score)
    .reduce((total, item) => total + Number(item.peso_percentual || 0), 0);
  const pesoNovo = mapeamentos
    .filter((item) => item.selecao === SELECAO_INDICADOR_NOVO && item.novo_indicador?.participa_global_score)
    .reduce((total, item) => total + Number(item.novo_indicador.peso_percentual || 0), 0);
  return pesoExistente + pesoNovo;
}
