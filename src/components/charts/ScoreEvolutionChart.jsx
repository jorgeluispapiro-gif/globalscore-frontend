import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EstadoVazio } from '../ui/Estados';

function EventosDaEvolucao({ dados }) {
  const periodosComEventos = dados.filter((item) => item.eventos?.length);
  if (!periodosComEventos.length) return null;

  return <ol className="evolucao-eventos" aria-label="Eventos associados à evolução">{periodosComEventos.map((item) => <li key={item.periodo}>
    <div><time dateTime={item.periodo}>{item.periodo}</time><strong>Global Score {Number(item.global_score).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong></div>
    <ul>{item.eventos.map((evento) => <li key={evento.id}>{evento.titulo}</li>)}</ul>
  </li>)}</ol>;
}

export function ScoreEvolutionChart({ dados = [], indiceVisivel }) {
  if (dados.length < 2) return <><EstadoVazio titulo="Não há avaliações suficientes para exibir a evolução" descricao="São necessários ao menos dois períodos avaliados para mostrar a evolução." /><EventosDaEvolucao dados={dados} /></>;
  const visiveis = dados.slice(0, (indiceVisivel ?? dados.length - 1) + 1);
  const periodosMarcados = [...new Set(visiveis.filter((item) => item.eventos?.length).map((item) => item.periodo))];
  return <><div className="grafico-area"><ResponsiveContainer width="100%" height="100%"><LineChart data={visiveis} margin={{ top: 18, right: 18, left: -16, bottom: 4 }}><CartesianGrid stroke="#e5eaf0" strokeDasharray="3 6" vertical={false} /><XAxis dataKey="periodo" tickLine={false} axisLine={false} /><YAxis domain={[0, 100]} tickLine={false} axisLine={false} ticks={[0, 25, 50, 75, 100]} /><Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #dde3ea' }} formatter={(valor) => [Number(valor).toFixed(1), 'Global Score']} />{periodosMarcados.map((periodo) => <ReferenceLine key={periodo} x={periodo} stroke="#a96400" strokeDasharray="4 4" label={{ value: '●', fill: '#a96400', fontSize: 12 }} />)}<Line type="monotone" dataKey="global_score" stroke="#0b63ce" strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 3 }} activeDot={{ r: 7 }} isAnimationActive animationDuration={900} /></LineChart></ResponsiveContainer></div><EventosDaEvolucao dados={visiveis} /></>;
}
