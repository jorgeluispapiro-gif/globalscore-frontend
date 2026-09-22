import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, CalendarDays, ListOrdered, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { useProjeto } from '../hooks/useProjeto';
import { CabecalhoPagina, EstadoVazio, Mensagem } from '../components/ui/Estados';
import { MetricCard } from '../components/dashboard/MetricCard';
import { StoryControls } from '../components/dashboard/StoryControls';
import { RankingPanel } from '../components/dashboard/RankingPanel';
import { TimelineEvent } from '../components/dashboard/TimelineEvent';
import { ScoreEvolutionChart } from '../components/charts/ScoreEvolutionChart';
import { IndicatorRadarChart } from '../components/charts/IndicatorRadarChart';
import { IndicatorBarChart } from '../components/charts/IndicatorBarChart';

export function DashboardPage() {
  const { projeto, projetoId } = useProjeto();
  const [avaliacao, setAvaliacao] = useState(null);
  const [indicadores, setIndicadores] = useState([]);
  const [base, setBase] = useState(null);
  const [erro, setErro] = useState('');
  const [tocando, setTocando] = useState(false);
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    const id = localStorage.getItem('globalscore:ultima-avaliacao-id');
    if (!id || !projetoId) { setAvaliacao(null); return; }
    Promise.all([api.get(`/avaliacoes/${id}`), api.get(`/indicadores?projeto_id=${projetoId}`), api.get('/bases')])
      .then(([dadosAvaliacao, dadosIndicadores, bases]) => {
        setAvaliacao(dadosAvaliacao);
        setIndicadores(dadosIndicadores);
        setBase(bases.find((item) => item.id === dadosAvaliacao.base_referencia_id) || null);
        setErro('');
      })
      .catch((falha) => setErro(falha.message));
  }, [projetoId]);

  const itens = useMemo(() => (avaliacao?.itens || []).filter((item) => item.pontuacao_percentil !== null).map((item) => ({ ...item, nome: indicadores.find((ind) => ind.id === item.indicador_id)?.nome || `Indicador ${item.indicador_id}` })), [avaliacao, indicadores]);
  const serie = avaliacao ? [{ periodo: avaliacao.periodo, global_score: avaliacao.global_score }] : [];
  const periodo = avaliacao?.periodo ? avaliacao.periodo.split('-').reverse().join('/') : '—';

  useEffect(() => {
    if (!tocando || serie.length < 2) return undefined;
    const temporizador = window.setInterval(() => {
      setIndice((atual) => {
        if (atual >= serie.length - 1) {
          setTocando(false);
          return atual;
        }
        return atual + 1;
      });
    }, 1800);
    return () => window.clearInterval(temporizador);
  }, [tocando, serie.length]);

  return <div className="pagina-dashboard">
    <CabecalhoPagina sobretitulo="Visão geral" titulo={projeto?.nome || 'Desempenho'} descricao="Visão consolidada do desempenho e sua evolução." acoes={<span className="selo-confianca"><ShieldCheck />Resultados consolidados</span>} />
    {erro && <Mensagem>{erro}</Mensagem>}
    {!projeto && <EstadoVazio titulo="Nenhum projeto selecionado" descricao="Crie ou selecione um projeto para começar a análise." />}
    {projeto && <>
      <section className="metric-grid"><MetricCard rotulo="GLOBAL SCORE" valor={avaliacao?.global_score != null ? avaliacao.global_score.toFixed(1).replace('.', ',') : '—'} detalhe={avaliacao ? 'Escala percentílica 0–100' : 'Nenhuma avaliação selecionada'} destaque /><MetricCard rotulo="RATING" valor="—" detalhe="Classificação ainda não disponível" /><MetricCard rotulo="POSIÇÃO" valor="—" detalhe="Posição ainda não disponível" /><MetricCard rotulo="PERÍODO" valor={periodo} detalhe={avaliacao?.status || 'Sem avaliação'} /></section>
      <section className="painel painel--principal"><div className="painel__cabecalho"><div><span className="indice-editorial">01</span><div><h2>Evolução do Global Score</h2><p>Acompanhe a variação do desempenho ao longo do tempo.</p></div></div><CalendarDays /></div><StoryControls tocando={tocando} aoTocar={() => setTocando(!tocando)} aoReiniciar={() => setIndice(0)} aoAvancar={() => setIndice(Math.min(indice + 1, serie.length - 1))} aoVoltar={() => setIndice(Math.max(indice - 1, 0))} desabilitado={serie.length < 2} /><ScoreEvolutionChart dados={serie} eventos={[]} indiceVisivel={indice} /><TimelineEvent evento={null} /></section>
      <div className="dashboard-grid dashboard-grid--duplo"><section className="painel"><div className="painel__cabecalho"><div><span className="indice-editorial">02</span><div><h2>Perfil de desempenho</h2><p>Comparação dos indicadores na escala de 0 a 100.</p></div></div><ArrowUpRight /></div><IndicatorRadarChart dados={itens} /></section><section className="painel"><div className="painel__cabecalho"><div><span className="indice-editorial">03</span><div><h2>Indicadores</h2><p>Pontuação e peso de cada indicador.</p></div></div><ListOrdered /></div><IndicatorBarChart dados={itens} /></section></div>
      <div className="dashboard-grid dashboard-grid--narrativa"><section className="painel painel--narrativa"><span className="sobretitulo">Leitura do período</span><h2>{avaliacao ? `Avaliação de ${periodo} com ${itens.length} indicador${itens.length === 1 ? '' : 'es'}.` : 'Calcule uma avaliação para iniciar a leitura dos resultados.'}</h2><p>{avaliacao ? 'O resultado resume o desempenho da entidade no período selecionado.' : 'Selecione uma avaliação para visualizar o resumo do período.'}</p></section><section className="painel"><div className="painel__cabecalho painel__cabecalho--simples"><div><span className="sobretitulo">Comparação</span><h2>Ranking do grupo</h2></div></div><RankingPanel dados={[]} entidadeId={avaliacao?.entidade_id} modoBase={base?.modo} /></section></div>
    </>}
  </div>;
}
