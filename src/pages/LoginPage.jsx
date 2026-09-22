import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/brand/globalscore-logo.png';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { Mensagem } from '../components/ui/Estados';
import { supabaseConfigurado } from '../services/supabase';

export function LoginPage() {
  const { sessao, entrar } = useAutenticacao();
  const navegar = useNavigate();
  const localizacao = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (sessao) return <Navigate to="/dashboard" replace />;

  function submeter(evento) {
    evento.preventDefault();
    setErro('');
    setEnviando(true);
    // A cadeia permanece dentro do componente para que falhas do provedor
    // sejam transformadas em feedback visual, sem rejeições soltas no browser.
    Promise.resolve()
      .then(() => entrar(email, senha))
      .then(() => navegar(localizacao.state?.origem || '/dashboard', { replace: true }))
      .catch((falha) => setErro(falha.message))
      .finally(() => setEnviando(false));
  }

  return <main className="login-page">
    <section className="login-card" aria-labelledby="titulo-login">
      <div className="login-card__marca"><img src={logo} alt="GlobalScore" /><span>MEASURE <i /> COMPARE <i /> ADVANCE</span></div>
      <div className="login-card__cabecalho"><span className="selo-sistema"><LockKeyhole /> Ambiente de gestão</span><h1 id="titulo-login">Acesso ao sistema</h1><p>Entre com sua conta corporativa para continuar.</p></div>
      {!supabaseConfigurado && <Mensagem>Configuração local do Supabase pendente. Preencha o arquivo .env.</Mensagem>}
      {erro && <Mensagem>{erro}</Mensagem>}
      <form onSubmit={submeter} className="formulario">
        <label>E-mail<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@empresa.com" /></label>
        <label>Senha<div className="campo-senha"><input type={mostrarSenha ? 'text' : 'password'} autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Digite sua senha" /><button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}>{mostrarSenha ? <EyeOff /> : <Eye />}</button></div></label>
        <button className="botao botao--primario botao--grande" disabled={enviando || !supabaseConfigurado}>{enviando ? 'AUTENTICANDO…' : 'ENTRAR'}</button>
      </form>
      <footer>Autenticação protegida por Supabase Auth</footer>
    </section>
    <div className="login-page__assinatura"><strong>DADOS QUE ORIENTAM DECISÕES.</strong><span>Comparação transparente. Evolução mensurável.</span></div>
  </main>;
}
