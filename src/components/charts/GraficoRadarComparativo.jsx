import { useEffect, useMemo, useState } from 'react';
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { api } from '../../services/api';
import { EstadoVazio } from '../ui/Estados';

const CORES_ENTIDADES = ['#0b63ce', '#00866a', '#a96400', '#a83a54', '#7047a3', '#21718c'];

function abreviar(nome) {
  return nome.length > 22 ? `${nome.slice(0, 20)}…` : nome;
}

function TooltipRadar({ active, payload }) {
  if (!active || !payload?.length) return null;
  const indicador = payload[0]?.payload?.indicador_nome;

  return <div className="radar-tooltip">
    <strong>{indicador}</strong>
    {payload.filter((item) => item.value != null).map((item) => <div key={item.dataKey}>
      <i style={{ background: item.color }} />
      <span>{item.name}</span>
      <b>P{item.value}</b>
    </div>)}
  </div>;
}

export function GraficoRadarComparativo({ entidades = [], baseReferenciaId, periodo }) {
  const assinaturaEntidades = entidades.map((item) => item.entidade_id).join(',');
  const [selecionadas, setSelecionadas] = useState([]);
  const [detalhes, setDetalhes] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  // Ao trocar a Base, o período ou o conjunto avaliado, reinicia a comparação
  // com a primeira entidade do ranking. As demais entram somente por escolha do usuário.
  useEffect(() => {
    setSelecionadas(entidades[0] ? [String(entidades[0].entidade_id)] : []);
    setDetalhes([]);
    setBusca('');
    setErro('');
  }, [baseReferenciaId, periodo, assinaturaEntidades]);

  useEffect(() => {
    let ativo = true;
    if (!selecionadas.length || !baseReferenciaId || !periodo) {
      setDetalhes([]);
      setCarregando(false);
      return () => { ativo = false; };
    }

    setCarregando(true);
    setErro('');
    Promise.all(selecionadas.map((entidadeId) => api.get(
      `/analytics/entidades/${entidadeId}?base_referencia_id=${baseReferenciaId}&periodo=${periodo}`,
    )))
      .then((respostas) => { if (ativo) setDetalhes(respostas); })
      .catch((falha) => {
        if (!ativo) return;
        setDetalhes([]);
        setErro(falha.message);
      })
      .finally(() => { if (ativo) setCarregando(false); });

    return () => { ativo = false; };
  }, [selecionadas, baseReferenciaId, periodo]);

  const entidadesFiltradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    if (!termo) return entidades;
    return entidades.filter((item) => item.entidade_nome.toLocaleLowerCase('pt-BR').includes(termo));
  }, [busca, entidades]);

  const series = useMemo(() => detalhes.map((detalhe, indice) => ({
    entidade_id: detalhe.entidade_id,
    entidade_nome: detalhe.entidade_nome,
    chave: `entidade_${detalhe.entidade_id}`,
    cor: CORES_ENTIDADES[indice % CORES_ENTIDADES.length],
  })), [detalhes]);

  const dadosRadar = useMemo(() => {
    const indicadores = new Map();
    detalhes.forEach((detalhe) => detalhe.indicadores.forEach((indicador) => {
      if (!indicadores.has(indicador.indicador_id)) {
        indicadores.set(indicador.indicador_id, {
          indicador_id: indicador.indicador_id,
          indicador_nome: indicador.indicador_nome,
        });
      }
    }));

    return [...indicadores.values()].map((indicador) => {
      const ponto = {
        indicador: abreviar(indicador.indicador_nome),
        indicador_nome: indicador.indicador_nome,
      };
      detalhes.forEach((detalhe) => {
        const item = detalhe.indicadores.find(
          (candidato) => candidato.indicador_id === indicador.indicador_id,
        );
        ponto[`entidade_${detalhe.entidade_id}`] = item?.pontuacao_percentil ?? null;
      });
      return ponto;
    });
  }, [detalhes]);

  function alternarEntidade(entidadeId) {
    const id = String(entidadeId);
    setSelecionadas((atuais) => atuais.includes(id)
      ? atuais.filter((item) => item !== id)
      : [...atuais, id]);
  }

  if (!entidades.length) {
    return <section className="secao-analitica radar-comparativo">
      <EstadoVazio compacto titulo="Sem entidades calculadas para comparar" descricao="Processe as avaliações do período para habilitar a comparação por indicadores." />
    </section>;
  }

  return <section className="secao-analitica radar-comparativo" aria-labelledby="titulo-radar-comparativo">
    <div className="secao-editorial__cabecalho">
      <div><span>Perfil comparativo</span><h2 id="titulo-radar-comparativo">Comparação por indicadores</h2></div>
      <small>Percentis de 0 a 100</small>
    </div>
    <div className="radar-comparativo__corpo">
      <aside className="radar-comparativo__seletor">
        <div><strong>Unidades no radar</strong><small>Selecione as unidades que deseja comparar no mesmo período.</small></div>
        <label>Localizar unidade<input type="search" value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Digite o nome" /></label>
        <div className="radar-comparativo__lista">
          {entidadesFiltradas.map((entidade) => <label key={entidade.entidade_id}>
            <input
              type="checkbox"
              checked={selecionadas.includes(String(entidade.entidade_id))}
              onChange={() => alternarEntidade(entidade.entidade_id)}
            />
            <span>{entidade.entidade_nome}</span>
            <b>{Number(entidade.global_score).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</b>
          </label>)}
        </div>
        <strong className="radar-comparativo__total">{selecionadas.length} {selecionadas.length === 1 ? 'unidade selecionada' : 'unidades selecionadas'}</strong>
      </aside>

      <div className="radar-comparativo__grafico">
        {erro && <p className="radar-comparativo__erro">{erro}</p>}
        {carregando && <div className="dashboard-carregando" role="status">Preparando comparação…</div>}
        {!carregando && !erro && !selecionadas.length && <EstadoVazio compacto titulo="Selecione ao menos uma unidade" descricao="Cada unidade selecionada será representada por uma linha no radar." />}
        {!carregando && !erro && selecionadas.length > 0 && !dadosRadar.length && <EstadoVazio compacto titulo="Sem indicadores calculados" descricao="As unidades selecionadas não possuem pontuações percentílicas no período." />}
        {!carregando && !erro && dadosRadar.length > 0 && <>
          <ResponsiveContainer width="100%" height={660}>
            <RadarChart data={dadosRadar} outerRadius="72%" margin={{ top: 28, right: 50, bottom: 28, left: 50 }}>
              <PolarGrid stroke="#d7e0ea" />
              <PolarAngleAxis dataKey="indicador" tick={{ fill: '#33445c', fontSize: 12, fontWeight: 600 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tick={{ fill: '#718096', fontSize: 10 }} />
              <Tooltip content={<TooltipRadar />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '14px' }} />
              {series.map((serie) => <Radar
                key={serie.entidade_id}
                name={serie.entidade_nome}
                dataKey={serie.chave}
                stroke={serie.cor}
                fill={serie.cor}
                fillOpacity={0.08}
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#fff', strokeWidth: 2 }}
                isAnimationActive={false}
              />)}
            </RadarChart>
          </ResponsiveContainer>
          {dadosRadar.length < 3 && <p className="radar-comparativo__nota">O radar fica mais informativo quando a Base possui pelo menos três indicadores válidos.</p>}
        </>}
      </div>
    </div>
  </section>;
}
