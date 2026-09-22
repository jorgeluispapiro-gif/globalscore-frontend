import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { exigirSupabase, supabase, supabaseConfigurado } from '../services/supabase';

export const ContextoAutenticacao = createContext(null);

export function ProvedorAutenticacao({ children }) {
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!supabaseConfigurado) {
      setCarregando(false);
      return undefined;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setCarregando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao);
      setCarregando(false);
    });
    const expirar = () => setSessao(null);
    window.addEventListener('globalscore:sessao-expirada', expirar);
    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener('globalscore:sessao-expirada', expirar);
    };
  }, []);

  async function entrar(email, senha) {
    const cliente = exigirSupabase();
    const { data, error } = await cliente.auth.signInWithPassword({ email, password: senha });
    if (error) throw new Error('E-mail ou senha inválidos. Verifique os dados e tente novamente.');
    setSessao(data.session);
    return data.session;
  }

  async function sair() {
    if (supabase) await supabase.auth.signOut();
    setSessao(null);
  }

  const valor = useMemo(
    () => ({ sessao, usuario: sessao?.user, carregando, entrar, sair }),
    [sessao, carregando],
  );
  return <ContextoAutenticacao.Provider value={valor}>{children}</ContextoAutenticacao.Provider>;
}

export function useAutenticacao() {
  const contexto = useContext(ContextoAutenticacao);
  if (!contexto) throw new Error('useAutenticacao deve ser usado dentro do provedor.');
  return contexto;
}
