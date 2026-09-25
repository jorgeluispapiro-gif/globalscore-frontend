import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Play, Plus, Scale } from 'lucide-react';
import { CabecalhoPagina, EstadoVazio, Mensagem } from '../components/ui/Estados';
import { useProjeto } from '../hooks/useProjeto';
import { api } from '../services/api';

const baseInicial = {
  nome: '', grupo_id: '', modo: 'ENTRE_ENTIDADES', entidade_referencia_id: '',
  periodo_inicial: '', periodo_final: '', cobertura_minima_percentual: 50,
};
const loteInicial = { base_referencia_id: '', periodo_inicial: '', periodo_final: '' };
const rotulos = {
  RASCUNHO: 'Rascunho', PROCESSADA: 'Processada', ATIVA: 'Ativa', SUBSTITUIDA: 'Substituída',
  VALIDO: 'Válido', SEM_VARIABILIDADE: 'Sem variabilidade', SEM_DADOS: 'Sem dados',
  CALCULADA: 'Calculada', INCOMPLETA: 'Incompleta', JA_EXISTENTE: 'Já existente', ERRO: 'Erro',
};

function rotulo(status) { return rotulos[status] || status; }
function atualizarLista(lista, base) {
  return lista.some((item) => item.id === base.id)
    ? lista.map((item) => (item.id === base.id ? base : item))
    : [...lista, base];
}

export function AvaliacoesPage() {
  const { projetoId } = useProjeto();
  const [grupos, setGrupos] = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [indicadores, setIndicadores] = useState([]);
  const [bases, setBases] = useState([]);
  const [baseId, setBaseId] = useState('');
  const [formularioBase, setFormularioBase] = useState(baseInicial);
  const [formularioLote, setFormularioLote] = useState(loteInicial);
  const [pesos, setPesos] = useState({});
  const [pesosAlterados, setPesosAlterados] = useState(false);
  const [criando, setCriando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [acao, setAcao] = useState('');

  const carregar = useCallback(async () => {
    if (!projetoId) { setGrupos([]); setEntidades([]); setIndicadores([]); setBases([]); return; }
    try {
      const [g, e, i, b] = await Promise.all([
        api.get(`/grupos?projeto_id=${projetoId}`),
        api.get(`/entidades?projeto_id=${projetoId}`),
        api.get(`/indicadores?projeto_id=${projetoId}`),
        api.get(`/bases?projeto_id=${projetoId}`),
      ]);
      setGrupos(g.filter((item) => item.ativo));
      setEntidades(e.filter((item) => item.ativa));
      setIndicadores(i);
      setBases(b);
      setBaseId((atual) => String(
        b.find((item) => String(item.id) === String(atual))?.id
        || b.find((item) => item.status === 'ATIVA')?.id || b[0]?.id || '',
      ));
    } catch (erro) { setMensagem({ tipo: 'erro', texto: erro.message }); }
  }, [projetoId]);

  useEffect(() => {
    setFormularioBase(baseInicial); setFormularioLote(loteInicial); setResultado(null); setCriando(false);
    carregar();
  }, [carregar]);

  const base = bases.find((item) => String(item.id) === String(baseId)) || null;
  const basesAtivas = bases.filter((item) => item.status === 'ATIVA');
  const entidadesDoGrupo = entidades.filter((item) => String(item.grupo_id) === String(formularioBase.grupo_id));
  const indicadoresPorId = useMemo(
    () => Object.fromEntries(indicadores.map((item) => [item.id, item])), [indicadores],
  );
  const pesoTotal = useMemo(() => (base?.indicadores || [])
    .filter((item) => item.status === 'VALIDO')
    .reduce((soma, item) => soma + Number(pesos[item.indicador_id] ?? item.peso_aplicado), 0),
  [base, pesos]);

  useEffect(() => {
    setPesos(Object.fromEntries((base?.indicadores || []).map((item) => [item.indicador_id, item.peso_aplicado])));
    setPesosAlterados(false);
  }, [base]);

  function abrirNovaBase() {
    setFormularioBase({ ...baseInicial, grupo_id: grupos[0]?.id || '' });
    setCriando(true); setMensagem(null);
  }

  async function criarBase(evento) {
    evento.preventDefault(); setAcao('criar'); setMensagem(null);
    try {
      const criada = await api.post('/bases', {
        projeto_id: Number(projetoId), grupo_id: Number(formularioBase.grupo_id),
        modo: formularioBase.modo,
        entidade_referencia_id: formularioBase.modo === 'HISTORICO_ENTIDADE'
          ? Number(formularioBase.entidade_referencia_id) : null,
        nome: formularioBase.nome,
        versao: Math.max(
          0,
          ...bases
            .filter((item) => String(item.grupo_id) === String(formularioBase.grupo_id))
            .map((item) => Number(item.versao)),
        ) + 1,
        periodo_inicial: formularioBase.periodo_inicial, periodo_final: formularioBase.periodo_final,
        cobertura_minima_percentual: Number(formularioBase.cobertura_minima_percentual),
      });
      setBases((atuais) => atualizarLista(atuais, criada)); setBaseId(String(criada.id)); setCriando(false);
      setMensagem({ tipo: 'sucesso', texto: 'Base de Referência criada. Processe a base para revisar sua população.' });
    } catch (erro) { setMensagem({ tipo: 'erro', texto: erro.message }); } finally { setAcao(''); }
  }

  async function processarBase() {
    setAcao('processar'); setMensagem(null);
    try {
      const processada = await api.post(`/bases/${base.id}/processar`);
      setBases((atuais) => atualizarLista(atuais, processada));
      setMensagem({ tipo: 'sucesso', texto: 'Base processada. Revise a população e os pesos antes de ativar.' });
    } catch (erro) { setMensagem({ tipo: 'erro', texto: erro.message }); } finally { setAcao(''); }
  }

  async function salvarPesos() {
    setAcao('pesos'); setMensagem(null);
    try {
      const dados = Object.fromEntries(Object.entries(pesos).map(([id, peso]) => [id, Number(peso)]));
      const atualizada = await api.patch(`/bases/${base.id}/pesos`, { pesos: dados });
      setBases((atuais) => atualizarLista(atuais, atualizada));
      setPesosAlterados(false);
      setMensagem({ tipo: 'sucesso', texto: 'Pesos salvos na Base de Referência.' });
    } catch (erro) { setMensagem({ tipo: 'erro', texto: erro.message }); } finally { setAcao(''); }
  }

  async function ativarBase() {
    setAcao('ativar'); setMensagem(null);
    try {
      const ativada = await api.post(`/bases/${base.id}/ativar`);
      setBases((atuais) => atualizarLista(atuais, ativada));
      setBaseId(String(ativada.id));
      setFormularioLote((atual) => ({ ...atual, base_referencia_id: String(ativada.id) }));
      await carregar();
      setMensagem({ tipo: 'sucesso', texto: 'Base ativada como referência vigente.' });
    } catch (erro) { setMensagem({ tipo: 'erro', texto: erro.message }); } finally { setAcao(''); }
  }

  async function processarLote(evento) {
    evento.preventDefault(); setAcao('lote'); setResultado(null); setMensagem(null);
    try {
      const dados = await api.post('/avaliacoes/processar-lote', {
        base_referencia_id: Number(formularioLote.base_referencia_id),
        periodo_inicial: formularioLote.periodo_inicial, periodo_final: formularioLote.periodo_final,
      });
      setResultado(dados);
      setMensagem({ tipo: 'sucesso', texto: 'Processamento concluído para o intervalo selecionado.' });
    } catch (erro) { setMensagem({ tipo: 'erro', texto: erro.message }); } finally { setAcao(''); }
  }

  return <div>
    <CabecalhoPagina sobretitulo="Referência e resultados" titulo="Avaliações" descricao="Configure a régua histórica do projeto e processe os resultados de todas as unidades em um único intervalo." />
    {mensagem && <Mensagem tipo={mensagem.tipo}>{mensagem.texto}</Mensagem>}
    {!projetoId ? <EstadoVazio titulo="Nenhum projeto selecionado" descricao="Selecione um projeto antes de preparar a Base de Referência." /> : <>
      <section className="painel painel-explicacao-base"><Scale aria-hidden="true" /><div><span className="sobretitulo">Base de Referência</span><h2>Uma régua congelada para comparar os próximos períodos</h2><p>A base reúne o histórico escolhido, forma os padrões de comparação e permanece preservada depois da ativação. Novos dados não alteram essa referência automaticamente.</p></div></section>

      <section className="secao-avaliacoes">
        <div className="secao-avaliacoes__cabecalho"><div><span className="sobretitulo">1. Preparar a referência</span><h2>Bases do projeto</h2></div><button className="botao botao--primario" type="button" onClick={abrirNovaBase} disabled={!grupos.length}><Plus aria-hidden="true" />Nova base</button></div>
        {criando && <section className="painel formulario-painel"><h2>Criar Base de Referência</h2><form className="formulario formulario--grade" onSubmit={criarBase}>
          <label>Nome<input required value={formularioBase.nome} onChange={(e) => setFormularioBase({ ...formularioBase, nome: e.target.value })} /></label>
          <label>Grupo comparável<select required value={formularioBase.grupo_id} onChange={(e) => setFormularioBase({ ...formularioBase, grupo_id: e.target.value, entidade_referencia_id: '' })}><option value="">Selecione</option>{grupos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
          <label>Forma de comparação<select value={formularioBase.modo} onChange={(e) => setFormularioBase({ ...formularioBase, modo: e.target.value, entidade_referencia_id: '' })}><option value="ENTRE_ENTIDADES">Comparar unidades do grupo</option><option value="HISTORICO_ENTIDADE">Acompanhar uma unidade pelo próprio histórico</option></select></label>
          {formularioBase.modo === 'HISTORICO_ENTIDADE' && <label>Unidade de referência<select required value={formularioBase.entidade_referencia_id} onChange={(e) => setFormularioBase({ ...formularioBase, entidade_referencia_id: e.target.value })}><option value="">Selecione</option>{entidadesDoGrupo.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>}
          <label>Início do histórico<input type="month" required value={formularioBase.periodo_inicial} onChange={(e) => setFormularioBase({ ...formularioBase, periodo_inicial: e.target.value })} /></label>
          <label>Fim do histórico<input type="month" required value={formularioBase.periodo_final} onChange={(e) => setFormularioBase({ ...formularioBase, periodo_final: e.target.value })} /></label>
          <label>Cobertura histórica mínima (%)<input type="number" min="0" max="100" step="1" required value={formularioBase.cobertura_minima_percentual} onChange={(e) => setFormularioBase({ ...formularioBase, cobertura_minima_percentual: e.target.value })} /></label>
          <div className="formulario__acoes campo-largo"><button type="button" className="botao botao--secundario" onClick={() => setCriando(false)}>Cancelar</button><button className="botao botao--primario" disabled={acao === 'criar'}>Criar base</button></div>
        </form></section>}

        {!bases.length ? <EstadoVazio compacto titulo="Nenhuma Base de Referência" descricao="Crie a primeira régua histórica deste projeto." /> : <div className="seletor-bases" role="list" aria-label="Bases de Referência">{bases.map((item) => <button type="button" role="listitem" key={item.id} className={`base-resumo ${String(item.id) === String(baseId) ? 'base-resumo--selecionada' : ''}`} onClick={() => setBaseId(String(item.id))}><span><strong>{item.nome}</strong><small>{item.periodo_inicial} a {item.periodo_final}</small></span><span className={`status status--${item.status.toLowerCase()}`}>{rotulo(item.status)}</span></button>)}</div>}

        {base && <section className="painel detalhe-base">
          <div className="painel__cabecalho painel__cabecalho--simples"><div><span className="sobretitulo">Base selecionada</span><h2>{base.nome}</h2><p>{base.periodo_inicial} a {base.periodo_final} · {base.modo === 'ENTRE_ENTIDADES' ? 'Comparação entre unidades' : 'Histórico da unidade'}</p></div><span className={`status status--${base.status.toLowerCase()}`}>{rotulo(base.status)}</span></div>
          {base.status === 'RASCUNHO' && <div className="chamada-acao-base"><p>Processe o histórico para conhecer a cobertura e formar a régua dos indicadores.</p><button type="button" className="botao botao--primario" onClick={processarBase} disabled={acao === 'processar'}><Play aria-hidden="true" />Processar base</button></div>}
          {base.status !== 'RASCUNHO' && <>
            <div className="resumo-base-processada"><div><span>Entidades elegíveis</span><strong>{base.quantidade_entidades}</strong></div><div><span>Indicadores analisados</span><strong>{base.indicadores?.length || 0}</strong></div><div><span>Situação</span><strong>{rotulo(base.status)}</strong></div></div>
            <div className="tabela-container tabela-base-indicadores"><table><thead><tr><th>Indicador</th><th>Status</th><th>População</th><th>Peso aplicado</th></tr></thead><tbody>{(base.indicadores || []).map((item) => <tr key={item.indicador_id}><td><strong>{indicadoresPorId[item.indicador_id]?.nome || `Indicador ${item.indicador_id}`}</strong></td><td><span className={`status status--${item.status.toLowerCase()}`}>{rotulo(item.status)}</span></td><td>{item.tamanho_populacao}</td><td>{base.status === 'PROCESSADA' && item.status === 'VALIDO' ? <label className="campo-peso-base"><input aria-label={`Peso de ${indicadoresPorId[item.indicador_id]?.nome || item.indicador_id}`} type="number" min="0" max="100" step="0.01" value={pesos[item.indicador_id] ?? item.peso_aplicado} onChange={(e) => { setPesos({ ...pesos, [item.indicador_id]: e.target.value }); setPesosAlterados(true); }} /><span>%</span></label> : `${Number(item.peso_aplicado).toLocaleString('pt-BR')}%`}</td></tr>)}</tbody></table></div>
            {base.status === 'PROCESSADA' && <div className={`faixa-pesos faixa-pesos-base ${Math.abs(pesoTotal - 100) < 0.001 && !pesosAlterados ? 'faixa-pesos--ok' : ''}`}><span>Total dos indicadores válidos</span><strong>{pesoTotal.toLocaleString('pt-BR')}%</strong><small>{pesosAlterados ? 'Salve os pesos ajustados antes de ativar.' : Math.abs(pesoTotal - 100) < 0.001 ? 'A Base pode ser ativada.' : 'Ajuste os pesos até totalizarem 100%.'}</small><div className="formulario__acoes"><button type="button" className="botao botao--secundario" onClick={salvarPesos} disabled={acao === 'pesos'}>Salvar pesos</button><button type="button" className="botao botao--primario" onClick={ativarBase} disabled={pesosAlterados || Math.abs(pesoTotal - 100) >= 0.001 || acao === 'ativar'}><CheckCircle2 aria-hidden="true" />Ativar base</button></div></div>}
            {base.status === 'ATIVA' && <p className="nota-interface">Esta é uma referência vigente e congelada. Sua estrutura e suas réguas permanecem preservadas.</p>}
          </>}
        </section>}
      </section>

      <section className="secao-avaliacoes">
        <div className="secao-avaliacoes__cabecalho"><div><span className="sobretitulo">2. Calcular o período</span><h2>Processar resultados em lote</h2><p>Escolha uma referência ativa e o intervalo que deseja avaliar.</p></div></div>
        {!basesAtivas.length ? <EstadoVazio compacto titulo="Nenhuma base ativa" descricao="Processe, revise e ative uma Base de Referência para calcular os resultados." /> : <section className="painel"><form className="formulario formulario-lote" onSubmit={processarLote}>
          <label>Base ativa<select required value={formularioLote.base_referencia_id} onChange={(e) => setFormularioLote({ ...formularioLote, base_referencia_id: e.target.value })}><option value="">Selecione</option>{basesAtivas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
          <label>Período inicial<input type="month" required value={formularioLote.periodo_inicial} onChange={(e) => setFormularioLote({ ...formularioLote, periodo_inicial: e.target.value })} /></label>
          <label>Período final<input type="month" required value={formularioLote.periodo_final} onChange={(e) => setFormularioLote({ ...formularioLote, periodo_final: e.target.value })} /></label>
          <button className="botao botao--primario" disabled={acao === 'lote'}><Play aria-hidden="true" />Processar resultados</button>
        </form></section>}
        {resultado && <section className="resultado-lote" aria-label="Resumo do processamento"><div className="resumo-lote"><div><span>Processadas</span><strong>{resultado.quantidade_processadas}</strong></div><div><span>Incompletas</span><strong>{resultado.quantidade_incompletas}</strong></div><div><span>Já existentes</span><strong>{resultado.quantidade_ja_existentes}</strong></div><div><span>Erros</span><strong>{resultado.quantidade_erros}</strong></div></div><div className="tabela-container"><table><thead><tr><th>Entidade</th><th>Período</th><th>Status</th><th>Global Score</th></tr></thead><tbody>{resultado.resultados.map((item, indice) => <tr key={`${item.entidade_id}-${item.periodo}-${indice}`}><td>{entidades.find((entidade) => entidade.id === item.entidade_id)?.nome || `Entidade ${item.entidade_id}`}</td><td>{item.periodo}</td><td><span className={`status status--${item.status.toLowerCase()}`}>{rotulo(item.status)}</span></td><td>{item.global_score != null ? Number(item.global_score).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '—'}</td></tr>)}</tbody></table></div></section>}
      </section>
    </>}
  </div>;
}
