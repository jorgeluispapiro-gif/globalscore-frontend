export function TimelineEvent({ evento }) {
  if (!evento) return null;
  return <aside className="timeline-event"><span>{evento.periodo}</span><strong>{evento.nome}</strong><p>{evento.descricao}</p></aside>;
}
