function formatarNumero(valor) {
  return Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function construirNotaExecutiva(leitura, quantidadeEventos = 0) {
  const frases = [];
  const atual = leitura?.global_score_atual;
  const variacao = leitura?.variacao_absoluta;

  if (atual === null || atual === undefined) {
    frases.push('Não há resultado calculado para o período selecionado.');
  } else if (leitura?.tendencia === 'SUBIU') {
    frases.push(`Global Score de ${formatarNumero(atual)} no período, ${formatarNumero(Math.abs(variacao))} pontos acima da avaliação anterior.`);
  } else if (leitura?.tendencia === 'CAIU') {
    frases.push(`Global Score de ${formatarNumero(atual)} no período, ${formatarNumero(Math.abs(variacao))} pontos abaixo da avaliação anterior.`);
  } else if (leitura?.tendencia === 'ESTAVEL') {
    frases.push(`Global Score manteve-se em ${formatarNumero(atual)} em relação à avaliação anterior.`);
  } else {
    frases.push(`Global Score de ${formatarNumero(atual)} no período. Este é o primeiro resultado disponível nesta Base de Referência.`);
  }

  if (quantidadeEventos === 1) {
    frases.push('No mesmo período, há 1 evento gerencial registrado.');
  } else if (quantidadeEventos > 1) {
    frases.push(`No mesmo período, foram registrados ${quantidadeEventos} eventos gerenciais.`);
  }

  return frases;
}
