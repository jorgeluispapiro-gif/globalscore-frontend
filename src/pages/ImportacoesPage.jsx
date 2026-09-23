import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  FileSpreadsheet,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import { useProjeto } from '../hooks/useProjeto';
import { api } from '../services/api';
import { CabecalhoPagina, EstadoVazio, Mensagem } from '../components/ui/Estados';
import {
  calcularPesoPlanejado,
  criarDadosNovoIndicador,
  montarColunasDoPayload,
  resumirMetricas,
  SELECAO_INDICADOR_EXISTENTE,
  SELECAO_INDICADOR_NOVO,
  validarIndicadoresMapeados,
} from '../utils/mapeamentoImportacao';
import { agruparEntidadesDesconhecidas, aplicarCriacaoEmLote, montarDecisoesEntidades, validarDecisoesEntidades } from '../utils/entidadesImportacao';

const configuracaoInicial = {
  linha_inicial: 2,
  linhas_cabecalho: [1],
  delimitador: ';',
  aba: '',
  formato_periodo: 'MM/AAAA',
  separador_decimal: ',',
  separador_milhar: '.',
  percentual_como: 'FRACAO',
};

function sugerirPapel(cabecalho) {
  const nome = String(cabecalho || '').toLocaleLowerCase('pt-BR');
  if (nome.includes('código') || nome.includes('codigo')) return 'CODIGO_ENTIDADE';
  if (nome.includes('filial') || nome.includes('unidade') || nome.includes('entidade')) return 'NOME_ENTIDADE';
  if (nome.includes('período') || nome.includes('periodo') || nome.includes('mês') || nome.includes('mes')) return 'PERIODO';
  return 'IGNORAR';
}

function ListaOcorrencias({ titulo, itens, tipo }) {
  if (!itens?.length) return null;
  const Icone = tipo === 'erro' ? ShieldAlert : AlertTriangle;
  return (
    <section className={`ocorrencias ocorrencias--${tipo}`}>
      <div className="ocorrencias__titulo">
        <Icone aria-hidden="true" />
        <div><strong>{titulo}</strong><span>{itens.length} ocorrência(s)</span></div>
      </div>
      <ul>
        {itens.map((item, indice) => (
          <li key={`${item.tipo}-${item.linha}-${item.coluna}-${indice}`}>
            <strong>{String(item.tipo || tipo).replaceAll('_', ' ')}</strong>
            <span>{item.mensagem || `Valor ${item.valor ?? item.valor_original ?? ''}`}</span>
            {(item.linha || item.coluna) && <small>Linha {item.linha || '—'} · Coluna {item.coluna || '—'}</small>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ImportacoesPage() {
  const { projeto, projetoId } = useProjeto();
  const [arquivo, setArquivo] = useState(null);
  const [lote, setLote] = useState(null);
  const [indicadores, setIndicadores] = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [decisoesEntidades, setDecisoesEntidades] = useState({});
  const [grupoLote, setGrupoLote] = useState('');
  const [errosEntidades, setErrosEntidades] = useState({});
  const [configuracao, setConfiguracao] = useState(configuracaoInicial);
  const [mapeamentos, setMapeamentos] = useState([]);
  const [validacao, setValidacao] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [processando, setProcessando] = useState(false);
  const [errosMapeamento, setErrosMapeamento] = useState({});

  useEffect(() => {
    setArquivo(null);
    setLote(null);
    setValidacao(null);
    setResultado(null);
    setMapeamentos([]);
    setErrosMapeamento({});
    setDecisoesEntidades({});
    setGrupoLote('');
    setErrosEntidades({});
    if (!projetoId) {
      setIndicadores([]);
      setEntidades([]);
      setGrupos([]);
      return;
    }
    Promise.all([
      api.get(`/indicadores?projeto_id=${projetoId}`),
      api.get(`/entidades?projeto_id=${projetoId}`),
      api.get(`/grupos?projeto_id=${projetoId}`),
    ])
      .then(([dadosIndicadores, dadosEntidades, dadosGrupos]) => {
        setIndicadores(dadosIndicadores.filter((item) => item.ativo === true));
        setEntidades(dadosEntidades.filter((item) => item.ativa === true));
        setGrupos(dadosGrupos.filter((item) => item.ativo === true));
      })
      .catch((erro) => setMensagem({ tipo: 'erro', texto: erro.message }));
  }, [projetoId]);

  const preview = useMemo(() => {
    if (!lote?.inspecao) return [];
    if (lote.tipo_arquivo === 'CSV') return lote.inspecao.preview || [];
    const aba = lote.inspecao.abas?.find((item) => item.nome === configuracao.aba);
    return aba?.preview || lote.inspecao.abas?.[0]?.preview || [];
  }, [lote, configuracao.aba]);

  const cabecalhos = preview[0] || [];
  const resumoMetricas = useMemo(
    () => resumirMetricas(mapeamentos, indicadores),
    [mapeamentos, indicadores],
  );
  const pesoPlanejado = useMemo(
    () => calcularPesoPlanejado(indicadores, mapeamentos),
    [indicadores, mapeamentos],
  );
  const entidadesDesconhecidas = useMemo(
    () => agruparEntidadesDesconhecidas(validacao?.erros || validacao?.problemas || []),
    [validacao],
  );

  function prepararMapeamento(linhas, tipoArquivo, inspecao) {
    const colunas = linhas[0] || [];
    setMapeamentos(colunas.map((nome, indice) => {
      const selecao = sugerirPapel(nome);
      return {
        indice_coluna: indice + 1,
        nome: String(nome || `Coluna ${indice + 1}`),
        selecao,
        candidata_metrica: selecao === 'IGNORAR',
        indicador_existente_id: '',
        novo_indicador: criarDadosNovoIndicador(nome),
      };
    }));
    setConfiguracao((atual) => ({
      ...atual,
      delimitador: tipoArquivo === 'CSV' ? (inspecao.sugestao_delimitador || ';') : atual.delimitador,
      aba: tipoArquivo === 'XLSX' ? (inspecao.abas?.[0]?.nome || '') : '',
    }));
  }

  async function enviarArquivo(evento) {
    evento.preventDefault();
    if (!arquivo || !projetoId) return;
    setProcessando(true);
    setMensagem(null);
    try {
      const dados = new FormData();
      dados.append('projeto_id', projetoId);
      dados.append('arquivo', arquivo);
      const resposta = await api.post('/importacoes', dados);
      setLote(resposta);
      const linhas = resposta.tipo_arquivo === 'CSV'
        ? resposta.inspecao.preview
        : resposta.inspecao.abas?.[0]?.preview || [];
      prepararMapeamento(linhas, resposta.tipo_arquivo, resposta.inspecao);
      setMensagem({ tipo: 'sucesso', texto: 'Arquivo recebido. Confirme como cada coluna deve ser interpretada.' });
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: erro.message });
    } finally {
      setProcessando(false);
    }
  }

  function alterarMapeamento(indice, selecao) {
    setMapeamentos((atuais) => atuais.map((item) => (
      item.indice_coluna === indice ? { ...item, selecao } : item
    )));
    setErrosMapeamento((atuais) => ({ ...atuais, [indice]: undefined }));
  }

  function alterarIndicadorExistente(indice, indicadorId) {
    setMapeamentos((atuais) => atuais.map((item) => (
      item.indice_coluna === indice ? { ...item, indicador_existente_id: indicadorId } : item
    )));
    setErrosMapeamento((atuais) => ({ ...atuais, [indice]: undefined }));
  }

  function alterarNovoIndicador(indice, campo, valor) {
    setMapeamentos((atuais) => atuais.map((item) => (
      item.indice_coluna === indice
        ? { ...item, novo_indicador: { ...item.novo_indicador, [campo]: valor } }
        : item
    )));
    setErrosMapeamento((atuais) => ({ ...atuais, [indice]: undefined }));
  }

  function montarPayload() {
    const colunas = montarColunasDoPayload(mapeamentos);
    const leitura = {
      linha_inicial: Number(configuracao.linha_inicial),
      linhas_cabecalho: configuracao.linhas_cabecalho.map(Number),
      colunas_utilizadas: mapeamentos.map((item) => item.indice_coluna),
      formato_periodo: configuracao.formato_periodo,
      formato_numerico: {
        separador_decimal: configuracao.separador_decimal,
        separador_milhar: configuracao.separador_milhar,
        percentual_como: configuracao.percentual_como,
      },
    };
    if (lote.tipo_arquivo === 'CSV') leitura.delimitador = configuracao.delimitador;
    else leitura.aba = configuracao.aba;
    return { configuracao_leitura: leitura, mapeamento: { formato: 'LARGO', colunas, decisoes_entidades: montarDecisoesEntidades(decisoesEntidades) } };
  }

  async function validar() {
    const erros = validarIndicadoresMapeados(mapeamentos);
    if (Object.keys(erros).length) {
      setErrosMapeamento(erros);
      setMensagem({ tipo: 'erro', texto: 'Revise os campos destacados antes de validar.' });
      return;
    }
    setProcessando(true);
    setMensagem(null);
    try {
      const resposta = await api.post(`/importacoes/${lote.id}/validar`, montarPayload());
      setValidacao(resposta);
      setMensagem({
        tipo: resposta.quantidade_erros ? 'erro' : (resposta.quantidade_alertas ? 'alerta' : 'sucesso'),
        texto: resposta.quantidade_erros
          ? 'A validação encontrou erros que precisam ser corrigidos.'
          : 'Validação concluída. Revise o resumo antes de confirmar.',
      });
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: erro.message });
    } finally {
      setProcessando(false);
    }
  }

  function alterarDecisaoEntidade(codigo, alteracao) {
    setDecisoesEntidades((atuais) => ({ ...atuais, [codigo]: { ...atuais[codigo], ...alteracao } }));
    setErrosEntidades((atuais) => ({ ...atuais, [codigo]: undefined }));
  }

  function revalidarEntidades() {
    const erros = validarDecisoesEntidades(entidadesDesconhecidas, decisoesEntidades);
    if (Object.keys(erros).length > 0) {
      setErrosEntidades(erros);
      setMensagem({ tipo: 'erro', texto: 'Revise as entidades pendentes antes de revalidar.' });
      return;
    }
    setErrosEntidades({});
    validar();
  }

  async function confirmar() {
    setProcessando(true);
    setMensagem(null);
    try {
      const resposta = await api.post(`/importacoes/${lote.id}/confirmar`, {
        confirmar_alertas: validacao?.quantidade_alertas > 0,
      });
      setResultado(resposta);
      setMensagem({ tipo: 'sucesso', texto: 'Importação concluída. As observações foram registradas com rastreabilidade.' });
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: erro.message });
    } finally {
      setProcessando(false);
    }
  }

  function reiniciar() {
    setArquivo(null);
    setLote(null);
    setValidacao(null);
    setResultado(null);
    setMapeamentos([]);
    setErrosMapeamento({});
    setDecisoesEntidades({});
    setGrupoLote('');
    setErrosEntidades({});
    setMensagem(null);
  }

  return (
    <div>
      <CabecalhoPagina
        sobretitulo="Entrada de dados"
        titulo="Importação assistida"
        descricao="O sistema lê o arquivo, mas o gestor confirma o significado das colunas antes de qualquer gravação."
      />
      <ol className="etapas-importacao" aria-label="Etapas da importação">
        {['Arquivo', 'Mapeamento', 'Validação', 'Resultado'].map((nome, indice) => {
          const etapaAtual = resultado ? 3 : validacao ? 2 : lote ? 1 : 0;
          return <li key={nome} className={indice <= etapaAtual ? 'etapa--ativa' : ''}><span>{indice + 1}</span><strong>{nome}</strong></li>;
        })}
      </ol>
      {mensagem && <Mensagem tipo={mensagem.tipo}>{mensagem.texto}</Mensagem>}
      {!projetoId && <EstadoVazio titulo="Nenhum projeto selecionado" descricao="Selecione o projeto que receberá as observações importadas." />}

      {projetoId && !lote && (
        <section className="painel painel-upload">
          <div className="painel-upload__icone"><Upload aria-hidden="true" /></div>
          <div><span className="sobretitulo">Etapa 1</span><h2>Selecione a planilha</h2><p>Projeto de destino: <strong>{projeto?.nome}</strong>. Formatos aceitos: CSV ou XLSX, até 10 MB.</p></div>
          <form className="formulario" onSubmit={enviarArquivo}>
            <label>Arquivo de dados<input type="file" required accept=".csv,.xlsx" onChange={(evento) => setArquivo(evento.target.files?.[0] || null)} /></label>
            <button className="botao botao--primario" disabled={!arquivo || processando}><FileSearch />{processando ? 'ANALISANDO…' : 'ANALISAR ARQUIVO'}</button>
          </form>
        </section>
      )}

      {lote && !resultado && (
        <>
          <section className="painel arquivo-resumo">
            <FileSpreadsheet aria-hidden="true" />
            <div><span className="sobretitulo">Arquivo analisado</span><h2>{lote.nome_arquivo_original}</h2><p>{lote.tipo_arquivo} · Lote #{lote.id} · nenhuma observação gravada nesta etapa</p></div>
            <button className="botao botao--texto" onClick={reiniciar}>Trocar arquivo</button>
          </section>
          <section className="painel">
            <div className="painel__cabecalho painel__cabecalho--simples"><div><span className="sobretitulo">Preview</span><h2>Confira a região de dados</h2><p>As dez primeiras linhas são exibidas somente para orientar o mapeamento.</p></div></div>
            <div className="configuracao-importacao">
              {lote.tipo_arquivo === 'XLSX' && <label>Aba<select value={configuracao.aba} onChange={(evento) => setConfiguracao({ ...configuracao, aba: evento.target.value })}>{lote.inspecao.abas.map((aba) => <option key={aba.nome}>{aba.nome}</option>)}</select></label>}
              {lote.tipo_arquivo === 'CSV' && <label>Delimitador<select value={configuracao.delimitador} onChange={(evento) => setConfiguracao({ ...configuracao, delimitador: evento.target.value })}><option value=";">Ponto e vírgula (;)</option><option value=",">Vírgula (,)</option><option value="\t">Tabulação</option><option value="|">Barra vertical (|)</option></select></label>}
              <label>Primeira linha de dados<input type="number" min="2" value={configuracao.linha_inicial} onChange={(evento) => setConfiguracao({ ...configuracao, linha_inicial: evento.target.value })} /></label>
              <label>Formato do período<select value={configuracao.formato_periodo} onChange={(evento) => setConfiguracao({ ...configuracao, formato_periodo: evento.target.value })}><option value="MM/AAAA">MM/AAAA</option><option value="AAAA-MM">AAAA-MM</option><option value="MES/AAAA">MÊS/AAAA</option></select></label>
              <label>Percentuais<select value={configuracao.percentual_como} onChange={(evento) => setConfiguracao({ ...configuracao, percentual_como: evento.target.value })}><option value="FRACAO">15% será 0,15</option><option value="NUMERO">15% será 15</option></select></label>
            </div>
            <div className="tabela-container tabela-preview"><table><tbody>{preview.map((linha, indiceLinha) => <tr key={indiceLinha}>{linha.map((celula, indiceColuna) => <td key={indiceColuna} className={indiceLinha === 0 ? 'preview-cabecalho' : ''}>{celula === null || celula === '' ? <span className="celula-vazia">vazio</span> : String(celula)}</td>)}</tr>)}</tbody></table></div>
          </section>

          <section className="painel">
            <div className="painel__cabecalho painel__cabecalho--simples"><div><span className="sobretitulo">Etapa 2</span><h2>Mapeie as colunas</h2><p>As sugestões são iniciais. Confirme cada papel explicitamente.</p></div></div>
            <div className="mapa-colunas">
              {mapeamentos.map((item) => {
                const nomeColuna = cabecalhos[item.indice_coluna - 1] || item.nome;
                return <article className="mapa-colunas__item" key={item.indice_coluna}>
                  <span>Coluna {item.indice_coluna}</span>
                  <strong>{nomeColuna}</strong>
                  <label>Função da coluna<select aria-label={`Mapeamento da coluna ${nomeColuna}`} value={item.selecao} onChange={(evento) => alterarMapeamento(item.indice_coluna, evento.target.value)}><option value="IGNORAR">Ignorar coluna</option><option value="CODIGO_ENTIDADE">Código da entidade</option><option value="NOME_ENTIDADE">Nome da entidade</option><option value="PERIODO">Período</option><option value={SELECAO_INDICADOR_EXISTENTE}>Associar a indicador existente</option><option value={SELECAO_INDICADOR_NOVO}>Criar novo indicador</option></select></label>
                  {item.selecao === SELECAO_INDICADOR_EXISTENTE && <label>Indicador<select aria-label={`Indicador existente da coluna ${nomeColuna}`} value={item.indicador_existente_id} onChange={(evento) => alterarIndicadorExistente(item.indice_coluna, evento.target.value)}><option value="">Selecione</option>{indicadores.map((indicador) => <option key={indicador.id} value={indicador.id}>{indicador.nome} · {indicador.unidade_medida} · {indicador.direcao === 'MAIOR_MELHOR' ? 'Maior é melhor' : 'Menor é melhor'}</option>)}</select></label>}
                  {item.selecao === SELECAO_INDICADOR_NOVO && <div className="novo-indicador">
                    <label>Código<input aria-label={`Código do novo indicador da coluna ${nomeColuna}`} value={item.novo_indicador.codigo} onChange={(evento) => alterarNovoIndicador(item.indice_coluna, 'codigo', evento.target.value)} /></label>
                    <label>Nome<input aria-label={`Nome do novo indicador da coluna ${nomeColuna}`} value={item.novo_indicador.nome} onChange={(evento) => alterarNovoIndicador(item.indice_coluna, 'nome', evento.target.value)} /></label>
                    <label>Unidade de medida<input aria-label={`Unidade do novo indicador da coluna ${nomeColuna}`} value={item.novo_indicador.unidade_medida} onChange={(evento) => alterarNovoIndicador(item.indice_coluna, 'unidade_medida', evento.target.value)} placeholder="Ex.: unidades, %, minutos" /></label>
                    <label>Direção<select aria-label={`Direção do novo indicador da coluna ${nomeColuna}`} value={item.novo_indicador.direcao} onChange={(evento) => alterarNovoIndicador(item.indice_coluna, 'direcao', evento.target.value)}><option value="">Selecione</option><option value="MAIOR_MELHOR">Maior é melhor</option><option value="MENOR_MELHOR">Menor é melhor</option></select></label>
                    <label>Peso percentual<input aria-label={`Peso do novo indicador da coluna ${nomeColuna}`} type="number" min="0" max="100" step="0.01" value={item.novo_indicador.peso_percentual} onChange={(evento) => alterarNovoIndicador(item.indice_coluna, 'peso_percentual', evento.target.value)} /></label>
                    <label className="check-label"><input type="checkbox" checked={item.novo_indicador.participa_global_score} onChange={(evento) => alterarNovoIndicador(item.indice_coluna, 'participa_global_score', evento.target.checked)} />Participa do Global Score</label>
                    <label className="check-label"><input type="checkbox" checked={item.novo_indicador.obrigatorio} onChange={(evento) => alterarNovoIndicador(item.indice_coluna, 'obrigatorio', evento.target.checked)} />Indicador obrigatório</label>
                  </div>}
                  {errosMapeamento[item.indice_coluna]?.length > 0 && <ul className="erros-mapeamento">{errosMapeamento[item.indice_coluna].map((erro) => <li key={erro}>{erro}</li>)}</ul>}
                </article>;
              })}
            </div>
            <section className="resumo-metricas" aria-label="Resumo das métricas">
              <div><span className="sobretitulo">Métricas</span><h3>{resumoMetricas.total} coluna(s) de métricas identificada(s)</h3><p>{resumoMetricas.associados} associada(s) a indicadores existentes · {resumoMetricas.novos} novo(s) indicador(es) · {resumoMetricas.ignorados} ignorada(s)</p></div>
              <ul>{resumoMetricas.detalhes.map((item) => <li key={`${item.indice_coluna}-${item.coluna}`}><strong>{item.coluna}</strong><span>{item.descricao}</span></li>)}</ul>
              <div className={`peso-planejado ${Math.abs(pesoPlanejado - 100) < 0.001 ? 'peso-planejado--ok' : 'peso-planejado--alerta'}`}><span>Peso total planejado para o Global Score</span><strong>{pesoPlanejado.toLocaleString('pt-BR')}%</strong>{Math.abs(pesoPlanejado - 100) >= 0.001 && <small>O total está diferente de 100%. Revise os pesos antes de ativar uma Base de Referência.</small>}</div>
            </section>
            <p className="nota-interface">As escolhas desta etapa apenas planejam a importação. Novos indicadores serão criados somente após a validação e a confirmação do lote.</p>
            <div className="formulario__acoes"><button className="botao botao--primario" onClick={validar} disabled={processando}>{processando ? 'VALIDANDO…' : 'VALIDAR SEM GRAVAR'}</button></div>
          </section>
        </>
      )}

      {validacao && !resultado && (
        <section className="painel painel-validacao">
          <div className="painel__cabecalho painel__cabecalho--simples"><div><span className="sobretitulo">Etapa 3 · Validação prévia</span><h2>Resultado da validação</h2><p>Erros bloqueiam a confirmação. Alertas e valores atípicos exigem revisão.</p></div><span className={`status status--${validacao.quantidade_erros ? 'erro' : validacao.quantidade_alertas ? 'alerta' : 'ativo'}`}>{validacao.status}</span></div>
          <div className="resumo-validacao"><div><span>Linhas lidas</span><strong>{validacao.linhas_lidas}</strong></div><div><span>Observações previstas</span><strong>{validacao.observacoes_a_criar}</strong></div><div><span>Erros</span><strong>{validacao.quantidade_erros}</strong></div><div><span>Alertas</span><strong>{validacao.quantidade_alertas}</strong></div></div>
          {entidadesDesconhecidas.length > 0 && <section className="entidades-resolver">
            <div className="entidades-resolver__cabecalho"><div><span className="sobretitulo">Decisão por código</span><h3>Entidades a resolver</h3><p>{entidadesDesconhecidas.length} entidade(s) desconhecida(s) · {entidadesDesconhecidas.reduce((total, item) => total + item.quantidade_linhas, 0)} linha(s) afetada(s)</p></div></div>
            {grupos.length === 0
              ? <Mensagem tipo="alerta">Não há grupos ativos neste projeto. Para criar entidades, cadastre ou ative um grupo antes de revalidar.</Mensagem>
              : <div className="acao-lote"><label>Grupo para criação em lote<select aria-label="Grupo para criar todas as entidades" value={grupoLote} onChange={(evento) => setGrupoLote(evento.target.value)}><option value="">Selecione</option>{grupos.map((grupo) => <option key={grupo.id} value={grupo.id}>{grupo.nome}</option>)}</select></label><button className="botao botao--secundario" disabled={!grupoLote} onClick={() => { setDecisoesEntidades((atuais) => aplicarCriacaoEmLote(entidadesDesconhecidas, atuais, grupoLote)); setErrosEntidades({}); }}>CRIAR TODAS AS ENTIDADES DESCONHECIDAS</button></div>}
            <div className="entidades-resolver__lista">{entidadesDesconhecidas.map((item) => {
              const decisao = decisoesEntidades[item.codigo] || {};
              return <article key={item.codigo} className={`entidade-decisao ${errosEntidades[item.codigo] ? 'entidade-decisao--erro' : ''}`}><div><strong>{item.codigo}</strong><span>{item.quantidade_linhas} linha(s) afetada(s)</span></div><label>Decisão<select aria-label={`Decisão para a entidade ${item.codigo}`} value={decisao.acao || ''} onChange={(evento) => alterarDecisaoEntidade(item.codigo, { acao: evento.target.value, grupo_id: undefined, entidade_id: undefined })}><option value="">Selecione</option><option value="CRIAR">Criar nova entidade</option><option value="ASSOCIAR">Associar a entidade existente</option><option value="IGNORAR">Ignorar esta entidade</option></select></label>
                {decisao.acao === 'CRIAR' && <div className="entidade-decisao__campos"><label>Código<input value={item.codigo} disabled /></label><label>Nome (opcional)<input aria-label={`Nome da nova entidade ${item.codigo}`} value={decisao.nome || ''} onChange={(evento) => alterarDecisaoEntidade(item.codigo, { nome: evento.target.value })} /></label><label>Grupo<select aria-label={`Grupo da nova entidade ${item.codigo}`} value={decisao.grupo_id || ''} onChange={(evento) => alterarDecisaoEntidade(item.codigo, { grupo_id: evento.target.value })}><option value="">Selecione</option>{grupos.map((grupo) => <option key={grupo.id} value={grupo.id}>{grupo.nome}</option>)}</select></label></div>}
                {decisao.acao === 'ASSOCIAR' && <label>Entidade existente<select aria-label={`Entidade existente para ${item.codigo}`} value={decisao.entidade_id || ''} onChange={(evento) => alterarDecisaoEntidade(item.codigo, { entidade_id: evento.target.value })}><option value="">Selecione</option>{entidades.map((entidade) => { const grupo = grupos.find((itemGrupo) => itemGrupo.id === entidade.grupo_id); return <option key={entidade.id} value={entidade.id}>{entidade.codigo} · {entidade.nome} · {grupo?.nome || 'Grupo não informado'}</option>; })}</select></label>}
                {decisao.acao === 'IGNORAR' && <p>As {item.quantidade_linhas} linha(s) desta entidade não serão importadas.</p>}
                {errosEntidades[item.codigo] && <p className="entidade-decisao__erro" role="alert">{errosEntidades[item.codigo]}</p>}
              </article>;
            })}</div>
            <div className="formulario__acoes"><button className="botao botao--primario" onClick={revalidarEntidades} disabled={processando}>{processando ? 'REVALIDANDO…' : 'REVALIDAR DADOS'}</button></div>
          </section>}
          {(validacao.erros?.length > 0 || validacao.alertas?.length > 0) && <details className="detalhes-validacao"><summary>Detalhes da validação</summary><ListaOcorrencias titulo="Erros bloqueantes" itens={validacao.erros} tipo="erro" /><ListaOcorrencias titulo="Alertas de qualidade e valores atípicos" itens={validacao.alertas} tipo="alerta" /></details>}
          {!validacao.quantidade_erros && <section className="resumo-entidades"><h3>Resumo das entidades</h3><p>Reconhecidas: <strong>{validacao.entidades_reconhecidas ?? 0}</strong> · Novas: <strong>{validacao.novas_entidades?.length ?? 0}</strong> · Associadas manualmente: <strong>{Object.values(decisoesEntidades).filter((item) => item.acao === 'ASSOCIAR').length}</strong> · Ignoradas: <strong>{Object.values(decisoesEntidades).filter((item) => item.acao === 'IGNORAR').length}</strong></p></section>}
          {!validacao.quantidade_erros && <div className="confirmacao-alertas"><CheckCircle2 aria-hidden="true" /><div><strong>{validacao.quantidade_alertas ? 'Existem alertas. Deseja confirmar mesmo assim?' : 'O lote está pronto para confirmação.'}</strong><p>A confirmação registra todas as observações do lote.</p></div><button className="botao botao--primario" onClick={confirmar} disabled={processando}>{processando ? 'CONFIRMANDO…' : validacao.quantidade_alertas ? 'ACEITAR ALERTAS E CONFIRMAR' : 'CONFIRMAR IMPORTAÇÃO'}</button></div>}
        </section>
      )}

      {resultado && (
        <section className="painel resultado-importacao">
          <CheckCircle2 aria-hidden="true" />
          <span className="sobretitulo">Etapa 4</span>
          <h2>Importação concluída</h2>
          <strong>{resultado.observacoes_criadas} observação(ões) criada(s)</strong>
          <p>Lote #{resultado.id} · {resultado.nome_arquivo_original} · status {resultado.status}</p>
          <button className="botao botao--secundario" onClick={reiniciar}>Importar outro arquivo</button>
        </section>
      )}
    </div>
  );
}
