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
  const [configuracao, setConfiguracao] = useState(configuracaoInicial);
  const [mapeamentos, setMapeamentos] = useState([]);
  const [validacao, setValidacao] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    setArquivo(null);
    setLote(null);
    setValidacao(null);
    setResultado(null);
    setMapeamentos([]);
    if (!projetoId) {
      setIndicadores([]);
      return;
    }
    api.get(`/indicadores?projeto_id=${projetoId}`)
      .then((dados) => setIndicadores(dados.filter((item) => item.ativo)))
      .catch((erro) => setMensagem({ tipo: 'erro', texto: erro.message }));
  }, [projetoId]);

  const preview = useMemo(() => {
    if (!lote?.inspecao) return [];
    if (lote.tipo_arquivo === 'CSV') return lote.inspecao.preview || [];
    const aba = lote.inspecao.abas?.find((item) => item.nome === configuracao.aba);
    return aba?.preview || lote.inspecao.abas?.[0]?.preview || [];
  }, [lote, configuracao.aba]);

  const cabecalhos = preview[0] || [];

  function prepararMapeamento(linhas, tipoArquivo, inspecao) {
    const colunas = linhas[0] || [];
    setMapeamentos(colunas.map((nome, indice) => ({
      indice_coluna: indice + 1,
      nome: String(nome || `Coluna ${indice + 1}`),
      selecao: sugerirPapel(nome),
    })));
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
  }

  function montarPayload() {
    const colunas = mapeamentos.map((item) => {
      if (item.selecao.startsWith('INDICADOR:')) {
        return {
          indice_coluna: item.indice_coluna,
          papel: 'VALOR_INDICADOR',
          indicador: { acao: 'EXISTENTE', indicador_id: Number(item.selecao.split(':')[1]) },
        };
      }
      return { indice_coluna: item.indice_coluna, papel: item.selecao };
    });
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
    return { configuracao_leitura: leitura, mapeamento: { formato: 'LARGO', colunas } };
  }

  async function validar() {
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
              {mapeamentos.map((item) => <label key={item.indice_coluna}><span>Coluna {item.indice_coluna}</span><strong>{cabecalhos[item.indice_coluna - 1] || item.nome}</strong><select value={item.selecao} onChange={(evento) => alterarMapeamento(item.indice_coluna, evento.target.value)}><option value="IGNORAR">Ignorar coluna</option><option value="CODIGO_ENTIDADE">Código da entidade</option><option value="NOME_ENTIDADE">Nome da entidade</option><option value="PERIODO">Período</option><optgroup label="Associar a indicador existente">{indicadores.map((indicador) => <option key={indicador.id} value={`INDICADOR:${indicador.id}`}>{indicador.nome} ({indicador.unidade_medida})</option>)}</optgroup></select></label>)}
            </div>
            <p className="nota-interface">O fluxo visual associa colunas a indicadores já cadastrados. Entidades desconhecidas serão apontadas na validação para decisão consciente.</p>
            <div className="formulario__acoes"><button className="botao botao--primario" onClick={validar} disabled={processando}>{processando ? 'VALIDANDO…' : 'VALIDAR SEM GRAVAR'}</button></div>
          </section>
        </>
      )}

      {validacao && !resultado && (
        <section className="painel painel-validacao">
          <div className="painel__cabecalho painel__cabecalho--simples"><div><span className="sobretitulo">Etapa 3 · Validação prévia</span><h2>Resultado da validação</h2><p>Erros bloqueiam a confirmação. Alertas e valores atípicos exigem revisão.</p></div><span className={`status status--${validacao.quantidade_erros ? 'erro' : validacao.quantidade_alertas ? 'alerta' : 'ativo'}`}>{validacao.status}</span></div>
          <div className="resumo-validacao"><div><span>Linhas lidas</span><strong>{validacao.linhas_lidas}</strong></div><div><span>Observações previstas</span><strong>{validacao.observacoes_a_criar}</strong></div><div><span>Erros</span><strong>{validacao.quantidade_erros}</strong></div><div><span>Alertas</span><strong>{validacao.quantidade_alertas}</strong></div></div>
          <ListaOcorrencias titulo="Erros bloqueantes" itens={validacao.erros} tipo="erro" />
          <ListaOcorrencias titulo="Alertas de qualidade e valores atípicos" itens={validacao.alertas} tipo="alerta" />
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
