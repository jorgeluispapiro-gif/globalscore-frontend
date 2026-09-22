import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { EstadoVazio } from '../ui/Estados';

export function IndicatorRadarChart({ dados = [], comparacao = [] }) {
  if (dados.length < 3) return <EstadoVazio titulo="Perfil ainda incompleto" descricao="Calcule uma avaliação com pelo menos três indicadores para visualizar o radar percentílico." />;
  const unidos = dados.map((item) => ({ ...item, comparacao: comparacao.find((outro) => outro.indicador_id === item.indicador_id)?.pontuacao_percentil }));
  return <div className="grafico-area grafico-area--radar"><ResponsiveContainer width="100%" height="100%"><RadarChart data={unidos} outerRadius="70%"><PolarGrid stroke="#dce4ec" /><PolarAngleAxis dataKey="nome" tick={{ fill: '#445267', fontSize: 12 }} /><PolarRadiusAxis domain={[0, 100]} tickCount={5} tick={{ fill: '#7a8799', fontSize: 10 }} /><Tooltip formatter={(valor) => [valor, 'Percentil']} /><Radar name="Período atual" dataKey="pontuacao_percentil" stroke="#0b63ce" fill="#0b63ce" fillOpacity={0.22} strokeWidth={2} />{comparacao.length > 0 && <Radar name="Comparação" dataKey="comparacao" stroke="#00afa0" fill="#00afa0" fillOpacity={0.12} strokeWidth={2} />}<Legend /></RadarChart></ResponsiveContainer></div>;
}
