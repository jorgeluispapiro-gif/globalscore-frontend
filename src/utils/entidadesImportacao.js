export function agruparEntidadesDesconhecidas(erros = []) {
  const grupos = new Map();
  erros.filter((item) => item.tipo === 'ENTIDADE_DESCONHECIDA').forEach((item) => {
    const codigo = String(item.valor_original ?? '').trim();
    if (!codigo) return;
    const atual = grupos.get(codigo) || { codigo, quantidade_linhas: 0, linhas: [] };
    atual.quantidade_linhas += 1;
    if (item.linha != null && !atual.linhas.includes(item.linha)) atual.linhas.push(item.linha);
    grupos.set(codigo, atual);
  });
  return [...grupos.values()];
}

export function montarDecisoesEntidades(decisoes = {}) {
  return Object.fromEntries(Object.entries(decisoes).flatMap(([codigo, decisao]) => {
    if (decisao.acao === 'IGNORAR') return [[codigo, { acao: 'IGNORAR' }]];
    if (decisao.acao === 'ASSOCIAR' && decisao.entidade_id) {
      return [[codigo, { acao: 'ASSOCIAR', entidade_id: Number(decisao.entidade_id) }]];
    }
    if (decisao.acao === 'CRIAR' && decisao.grupo_id) {
      const dados = { acao: 'CRIAR', grupo_id: Number(decisao.grupo_id) };
      if (String(decisao.nome || '').trim()) dados.nome = decisao.nome.trim();
      return [[codigo, dados]];
    }
    return [];
  }));
}

export function aplicarCriacaoEmLote(entidades, decisoes, grupoId) {
  if (!grupoId) return decisoes;
  const resultado = { ...decisoes };
  entidades.forEach(({ codigo }) => {
    if (!resultado[codigo]?.acao) resultado[codigo] = { acao: 'CRIAR', grupo_id: String(grupoId), nome: '' };
  });
  return resultado;
}

export function validarDecisoesEntidades(entidades = [], decisoes = {}) {
  const erros = {};
  entidades.forEach(({ codigo }) => {
    const decisao = decisoes[codigo] || {};
    if (!decisao.acao) erros[codigo] = 'Defina como esta entidade deve ser tratada.';
    else if (decisao.acao === 'CRIAR' && !decisao.grupo_id) erros[codigo] = 'Selecione o grupo da nova entidade.';
    else if (decisao.acao === 'ASSOCIAR' && !decisao.entidade_id) erros[codigo] = 'Selecione a entidade existente.';
  });
  return erros;
}
