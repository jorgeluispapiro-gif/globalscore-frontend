import { construirNotaExecutiva } from '../../utils/narrativaExecutiva';

export function ExecutiveNote({ leitura, quantidadeEventos = 0 }) {
  const frases = construirNotaExecutiva(leitura, quantidadeEventos);

  return <section className="nota-executiva" aria-labelledby="titulo-nota-executiva">
    <span>Leitura do período</span>
    <h3 id="titulo-nota-executiva">Nota executiva</h3>
    {frases.map((frase) => <p key={frase}>{frase}</p>)}
  </section>;
}
