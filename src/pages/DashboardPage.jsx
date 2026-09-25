import { useEffect, useMemo, useState } from 'react';
import { FileDown } from 'lucide-react';
import { api } from '../services/api';
import { useProjeto } from '../hooks/useProjeto';
import { EstadoVazio, Mensagem } from '../components/ui/Estados';
import { RankingPanel } from '../components/dashboard/RankingPanel';
import { IndicatorDiagnosticList } from '../components/dashboard/IndicatorDiagnosticList';
import { ExecutiveNote } from '../components/dashboard/ExecutiveNote';
import { EntityEvents } from '../components/dashboard/EntityEvents';
import { ScoreEvolutionChart } from '../components/charts/ScoreEvolutionChart';
import { GraficoRadarComparativo } from '../components/charts/GraficoRadarComparativo';

function periodoAtual() {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
}

function formatarNumero(valor, casas = 1) {
  if (valor === null || valor === undefined) return '—';
  return Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

function formatarPeriodo(periodo) {
  if (!periodo) return '—';
  const [ano, mes] = periodo.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(ano, mes - 1, 1));
}

export function DashboardPage() {
  const { projeto, projetoId } = useProjeto();
  const [grupos, setGrupos] = useState([]);
  const [grupoId, setGrupoId] = useState('');
  const [periodo, setPeriodo] = useState(periodoAtual);
  const [overview, setOverview] = useState(null);
  const [entidadeSelecionadaId, setEntidadeSelecionadaId] = useState('');
  const [detalhe, setDetalhe] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [carregandoOverview, setCarregandoOverview] = useState(false);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    setGrupos([]);
    setGrupoId('');
    setOverview(null);
    setDetalhe(null);
    setEventos([]);
    setEntidadeSelecionadaId('');
    setErro('');
    if (!projetoId) return () => { ativo = false; };

    api.get(`/grupos?projeto_id=${projetoId}`)
      .then((dados) => {
        if (!ativo) return;
        setGrupos(dados);
        setGrupoId(dados[0] ? String(dados[0].id) : '');
      })
      .catch((falha) => { if (ativo) setErro(falha.message); });
    return () => { ativo = false; };
  }, [projetoId]);

  useEffect(() => {
    let ativo = true;
    setOverview(null);
    setDetalhe(null);
    setErro('');
    if (!projetoId || !grupoId || !periodo) return () => { ativo = false; };

    setCarregandoOverview(true);
    api.get(`/analytics/overview?projeto_id=${projetoId}&grupo_id=${grupoId}&periodo=${periodo}`)
      .then((dados) => {
        if (!ativo) return;
        setOverview(dados);
        setEntidadeSelecionadaId((atual) => {
          if (dados.base_referencia?.modo === 'HISTORICO_ENTIDADE') {
            return String(dados.base_referencia.entidade_referencia_id || '');
          }
          const permaneceNoRanking = dados.ranking.some(
            (item) => String(item.entidade_id) === String(atual),
          );
          return permaneceNoRanking ? atual : String(dados.ranking[0]?.entidade_id || '');
        });
      })
      .catch((falha) => { if (ativo) setErro(falha.message); })
      .finally(() => { if (ativo) setCarregandoOverview(false); });
    return () => { ativo = false; };
  }, [projetoId, grupoId, periodo]);

  useEffect(() => {
    let ativo = true;
    setDetalhe(null);
    setEventos([]);
    if (!overview?.base_referencia_id || !entidadeSelecionadaId) {
      setCarregandoDetalhe(false);
      return () => { ativo = false; };
    }

    setCarregandoDetalhe(true);
    Promise.all([
      api.get(`/analytics/entidades/${entidadeSelecionadaId}?base_referencia_id=${overview.base_referencia_id}&periodo=${periodo}`),
      api.get(`/eventos?projeto_id=${projetoId}&entidade_id=${entidadeSelecionadaId}`),
    ])
      .then(([dadosDetalhe, dadosEventos]) => {
        if (!ativo) return;
        setDetalhe(dadosDetalhe);
        setEventos(dadosEventos);
      })
      .catch((falha) => { if (ativo) setErro(falha.message); })
      .finally(() => { if (ativo) setCarregandoDetalhe(false); });
    return () => { ativo = false; };
  }, [entidadeSelecionadaId, overview?.base_referencia_id, periodo, projetoId]);

  const grupoSelecionado = useMemo(
    () => grupos.find((grupo) => String(grupo.id) === String(grupoId)) || null,
    [grupos, grupoId],
  );
  const base = overview?.base_referencia;
  const avaliacao = detalhe?.avaliacao;
  const eventosDoPeriodo = eventos.filter((evento) => evento.periodo === periodo);

  async function atualizarEntidadeAposEvento() {
    const [dadosDetalhe, dadosEventos] = await Promise.all([
      api.get(`/analytics/entidades/${entidadeSelecionadaId}?base_referencia_id=${overview.base_referencia_id}&periodo=${periodo}`),
      api.get(`/eventos?projeto_id=${projetoId}&entidade_id=${entidadeSelecionadaId}`),
    ]);
    setDetalhe(dadosDetalhe);
    setEventos(dadosEventos);
  }

  async function criarEvento(dados) {
    await api.post('/eventos', {
      projeto_id: Number(projetoId),
      entidade_id: Number(entidadeSelecionadaId),
      ...dados,
    });
    await atualizarEntidadeAposEvento();
  }

  async function editarEvento(eventoId, dados) {
    await api.patch(`/eventos/${eventoId}`, dados);
    await atualizarEntidadeAposEvento();
  }

  async function excluirEvento(eventoId) {
    await api.delete(`/eventos/${eventoId}`);
    await atualizarEntidadeAposEvento();
  }

  if (!projeto) {
    return <EstadoVazio titulo="Nenhum projeto selecionado" descricao="Crie ou selecione um projeto para começar a análise." />;
  }

  return <div className="dashboard-analitico">
    <header className="dashboard-cabecalho">
      <div className="dashboard-cabecalho__titulo">
        <span className="sobretitulo">Visão geral</span>
        <h1>{projeto.nome}</h1>
        <p>Desempenho comparativo das entidades e evolução dos resultados.</p>
      </div>
      <div className="dashboard-filtros" aria-label="Filtros da análise">
        <label>Grupo<select value={grupoId} onChange={(evento) => setGrupoId(evento.target.value)}><option value="">Selecione um grupo</option>{grupos.map((grupo) => <option key={grupo.id} value={grupo.id}>{grupo.nome}</option>)}</select></label>
        <label>Período<input type="month" value={periodo} onChange={(evento) => setPeriodo(evento.target.value)} /></label>
      </div>
      <div className="dashboard-referencia" aria-label="Base de Referência usada">
        <span>Referência utilizada</span>
        <strong>{base ? `${base.nome} · v${base.versao}` : 'Nenhuma Base ativa'}</strong>
        {base && <small>{base.periodo_inicial} — {base.periodo_final}</small>}
      </div>
    </header>

    {erro && <Mensagem>{erro}</Mensagem>}
    {!grupoId && <EstadoVazio titulo="Nenhum grupo disponível" descricao="Cadastre um grupo comparável para iniciar a leitura do projeto." />}
    {grupoId && carregandoOverview && <div className="dashboard-carregando" role="status">Preparando visão do período…</div>}

    {grupoId && overview && <>
      <section className="dashboard-macro" aria-labelledby="titulo-macro">
        <div className="dashboard-macro__principal">
          <span id="titulo-macro">Unidades avaliadas</span>
          <strong>{overview.quantidade_avaliadas}</strong>
          <p>de {overview.quantidade_entidades} entidades em {formatarPeriodo(periodo)}</p>
        </div>
        <dl className="dashboard-macro__contexto">
          <div><dt>Resultados incompletos</dt><dd>{overview.quantidade_incompletas}</dd></div>
          <div><dt>Universo do grupo</dt><dd>{overview.quantidade_entidades}</dd></div>
          <div><dt>Grupo analisado</dt><dd>{grupoSelecionado?.nome || '—'}</dd></div>
          <div><dt>Modo da referência</dt><dd>{base?.modo === 'HISTORICO_ENTIDADE' ? 'Histórico da entidade' : base ? 'Entre entidades' : '—'}</dd></div>
        </dl>
      </section>

      {!base && <EstadoVazio titulo="Nenhuma Base de Referência ativa" descricao="Ative uma Base para consultar os resultados consolidados deste grupo." />}
      {base && <>
        {base.modo === 'ENTRE_ENTIDADES' && <GraficoRadarComparativo
          entidades={overview.ranking}
          baseReferenciaId={overview.base_referencia_id}
          periodo={periodo}
        />}
        <section className="dashboard-corpo">
        <aside className="dashboard-ranking" aria-labelledby="titulo-ranking">
          <div className="secao-editorial__cabecalho">
            <div><span>Comparação</span><h2 id="titulo-ranking">Ranking do período</h2></div>
            <small>{overview.ranking.length} resultados</small>
          </div>
          <RankingPanel
            dados={overview.ranking}
            entidadeId={Number(entidadeSelecionadaId)}
            modoBase={base.modo}
            aoSelecionar={(entidadeId) => setEntidadeSelecionadaId(String(entidadeId))}
          />
        </aside>

        <div className="dashboard-detalhe">
          {!entidadeSelecionadaId && <EstadoVazio titulo="Selecione uma entidade" descricao="Escolha uma unidade no ranking para aprofundar a análise." />}
          {entidadeSelecionadaId && carregandoDetalhe && <div className="dashboard-carregando" role="status">Carregando detalhe da entidade…</div>}
          {entidadeSelecionadaId && !carregandoDetalhe && detalhe && <>
            <section className="entidade-resumo" aria-labelledby="titulo-entidade">
              <div><span>Entidade selecionada</span><h2 id="titulo-entidade">{detalhe.entidade_nome}</h2><p>{formatarPeriodo(periodo)} · <b>{avaliacao?.status || 'SEM AVALIAÇÃO'}</b></p></div>
              <div className="entidade-resumo__resultado"><button type="button" className="botao botao--secundario nao-imprimir" onClick={() => window.print()}><FileDown aria-hidden="true" />Exportar relatório</button><div className="entidade-score"><span>Global Score</span><strong>{formatarNumero(avaliacao?.global_score)}</strong><small>escala 0–100</small></div></div>
            </section>

            <ExecutiveNote leitura={detalhe.leitura_periodo} quantidadeEventos={eventosDoPeriodo.length} />

            <section className="secao-analitica secao-analitica--evolucao" aria-labelledby="titulo-evolucao">
              <div className="secao-editorial__cabecalho"><div><span>Tendência</span><h2 id="titulo-evolucao">Evolução do Global Score</h2></div><small>Mesma Base de Referência</small></div>
              <ScoreEvolutionChart dados={detalhe.evolucao} />
            </section>

            <EntityEvents eventos={eventos} periodoPadrao={periodo} aoCriar={criarEvento} aoEditar={editarEvento} aoExcluir={excluirEvento} />

            <section className="secao-analitica" aria-labelledby="titulo-indicadores">
              <div className="secao-editorial__cabecalho"><div><span>Diagnóstico</span><h2 id="titulo-indicadores">Indicadores da entidade</h2></div><small>{detalhe.indicadores.length} indicadores</small></div>
              <IndicatorDiagnosticList dados={detalhe.indicadores} />
            </section>
          </>}
        </div>
        </section>
      </>}
    </>}
  </div>;
}
