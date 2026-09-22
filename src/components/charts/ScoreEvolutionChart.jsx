import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EstadoVazio } from '../ui/Estados';

export function ScoreEvolutionChart({ dados = [], eventos = [], indiceVisivel }) {
  if (dados.length < 2) return <EstadoVazio titulo="Não há avaliações suficientes para exibir a evolução" descricao="São necessários ao menos dois períodos calculados. A API atual ainda não lista o histórico de avaliações." />;
  const visiveis = dados.slice(0, (indiceVisivel ?? dados.length - 1) + 1);
  return <div className="grafico-area"><ResponsiveContainer width="100%" height="100%"><LineChart data={visiveis} margin={{ top: 18, right: 18, left: -16, bottom: 4 }}><CartesianGrid stroke="#e5eaf0" strokeDasharray="3 6" vertical={false} /><XAxis dataKey="periodo" tickLine={false} axisLine={false} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} ticks={[0, 25, 50, 75, 100]} /><Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #dde3ea' }} formatter={(valor) => [Number(valor).toFixed(1), 'Global Score']} />{eventos.map((evento) => <ReferenceLine key={evento.id} x={evento.periodo} stroke="#d4920b" strokeDasharray="4 4" label={{ value: evento.nome, fill: '#8a5a00', fontSize: 11 }} />)}<Line type="monotone" dataKey="global_score" stroke="#0b63ce" strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 3 }} activeDot={{ r: 7 }} isAnimationActive animationDuration={900} /></LineChart></ResponsiveContainer></div>;
}
