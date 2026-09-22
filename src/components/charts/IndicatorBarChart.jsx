import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EstadoVazio } from '../ui/Estados';

export function IndicatorBarChart({ dados = [] }) {
  if (!dados.length) return <EstadoVazio titulo="Indicadores sem resultado" descricao="Calcule uma avaliação para comparar o desempenho dos indicadores." />;
  const ordenados = [...dados].sort((a, b) => b.pontuacao_percentil - a.pontuacao_percentil);
  return <div className="grafico-area grafico-area--barras"><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={ordenados} margin={{ top: 4, right: 24, left: 28, bottom: 4 }}><CartesianGrid stroke="#e5eaf0" strokeDasharray="3 6" horizontal={false} /><XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="nome" width={110} tickLine={false} axisLine={false} tick={{ fill: '#445267', fontSize: 12 }} /><Tooltip formatter={(valor, _nome, contexto) => [`P${valor} · peso ${contexto.payload.peso_aplicado}%`, 'Desempenho']} /><Bar dataKey="pontuacao_percentil" fill="#0b63ce" radius={[0, 5, 5, 0]} animationDuration={800} /></BarChart></ResponsiveContainer></div>;
}
