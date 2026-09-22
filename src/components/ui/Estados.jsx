import { AlertCircle, CheckCircle2, Database, LoaderCircle } from 'lucide-react';

export function TelaCarregamento({ texto = 'Carregando' }) {
  return <div className="tela-carregamento"><LoaderCircle className="girando" aria-hidden="true" /><span>{texto}</span></div>;
}

export function EstadoVazio({ titulo, descricao, compacto = false }) {
  return <div className={`estado-vazio ${compacto ? 'estado-vazio--compacto' : ''}`}><Database aria-hidden="true" /><strong>{titulo}</strong><p>{descricao}</p></div>;
}

export function Mensagem({ tipo = 'erro', children }) {
  const Icone = tipo === 'sucesso' ? CheckCircle2 : AlertCircle;
  return <div className={`mensagem mensagem--${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}><Icone aria-hidden="true" /><span>{children}</span></div>;
}

export function CabecalhoPagina({ sobretitulo, titulo, descricao, acoes }) {
  return <header className="cabecalho-pagina"><div><span className="sobretitulo">{sobretitulo}</span><h1>{titulo}</h1>{descricao && <p>{descricao}</p>}</div>{acoes && <div className="cabecalho-pagina__acoes">{acoes}</div>}</header>;
}
