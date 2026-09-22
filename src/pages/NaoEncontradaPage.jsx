import { Link } from 'react-router-dom';
export function NaoEncontradaPage() { return <main className="pagina-central"><span className="numero-erro">404</span><h1>Página não encontrada</h1><p>O endereço informado não existe no GlobalScore.</p><Link className="botao botao--primario" to="/dashboard">Voltar à visão geral</Link></main>; }
