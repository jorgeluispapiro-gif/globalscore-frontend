import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BarChart3, Building2, ClipboardCheck, FolderKanban, Gauge, LogOut, Menu, Upload, X } from 'lucide-react';
import logo from '../../assets/brand/globalscore-logo.png';
import { useAutenticacao } from '../../hooks/useAutenticacao';
import { useProjeto } from '../../hooks/useProjeto';

const itens = [
  { para: '/dashboard', rotulo: 'Visão Geral', icone: Gauge },
  { para: '/projetos', rotulo: 'Projetos', icone: FolderKanban },
  { para: '/importacoes', rotulo: 'Importar Dados', icone: Upload },
  { para: '/entidades', rotulo: 'Entidades', icone: Building2 },
  { para: '/indicadores', rotulo: 'Indicadores', icone: BarChart3 },
  { para: '/avaliacoes', rotulo: 'Avaliações', icone: ClipboardCheck },
];

export function ShellAplicacao() {
  const [menuAberto, setMenuAberto] = useState(false);
  const { usuario, sair } = useAutenticacao();
  const { projetos, projetoId, projeto, selecionarProjeto, carregandoProjetos } = useProjeto();

  return <div className="app-shell">
    <aside className={`sidebar ${menuAberto ? 'sidebar--aberta' : ''}`}>
      <div className="sidebar__marca"><img src={logo} alt="GlobalScore" /><div><strong>GlobalScore</strong><span>Measure · Compare · Advance</span></div><button className="icone-botao sidebar__fechar" onClick={() => setMenuAberto(false)} aria-label="Fechar menu"><X /></button></div>
      <nav aria-label="Navegação principal">{itens.map(({ para, rotulo, icone: Icone }) => <NavLink key={para} to={para} onClick={() => setMenuAberto(false)} className={({ isActive }) => isActive ? 'nav-link nav-link--ativo' : 'nav-link'}><Icone aria-hidden="true" /><span>{rotulo}</span></NavLink>)}</nav>
      <div className="sidebar__rodape"><span className="sidebar__status"><i />Acompanhamento mensal</span><small>Desempenho comparativo</small></div>
    </aside>
    {menuAberto && <button className="sidebar-overlay" onClick={() => setMenuAberto(false)} aria-label="Fechar menu" />}
    <div className="app-main">
      <header className="topbar">
        <button className="icone-botao menu-botao" onClick={() => setMenuAberto(true)} aria-label="Abrir menu"><Menu /></button>
        <div className="topbar__contexto"><span>Projeto em análise</span><select aria-label="Projeto selecionado" value={projetoId} disabled={carregandoProjetos} onChange={(e) => selecionarProjeto(e.target.value)}><option value="">Nenhum projeto selecionado</option>{projetos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></div>
        <div className="topbar__usuario"><div className="avatar" aria-hidden="true">{(usuario?.email || 'U').slice(0, 1).toUpperCase()}</div><div><strong>{usuario?.email || 'Usuário autenticado'}</strong><span>{projeto?.status ? `Projeto ${projeto.status.toLowerCase()}` : 'Conta ativa'}</span></div><button className="botao botao--texto" onClick={sair}><LogOut aria-hidden="true" />Sair</button></div>
      </header>
      <main className="workspace"><Outlet /></main>
    </div>
  </div>;
}
