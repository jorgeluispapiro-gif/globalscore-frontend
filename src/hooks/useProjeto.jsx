import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const ContextoProjeto = createContext(null);

export function ProvedorProjeto({ children }) {
  const [projetos, setProjetos] = useState([]);
  const [projetoId, setProjetoId] = useState(() => localStorage.getItem('globalscore:projeto-id') || '');
  const [carregandoProjetos, setCarregando] = useState(true);

  function selecionarProjeto(id) {
    const valor = id ? String(id) : '';
    setProjetoId(valor);
    if (valor) localStorage.setItem('globalscore:projeto-id', valor);
    else localStorage.removeItem('globalscore:projeto-id');
  }

  async function recarregarProjetos() {
    setCarregando(true);
    try {
      const dados = await api.get('/projetos');
      setProjetos(dados);
      const existe = dados.some((item) => String(item.id) === String(projetoId));
      if (!existe && dados[0]) selecionarProjeto(dados[0].id);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { recarregarProjetos().catch(() => setCarregando(false)); }, []);

  const projeto = projetos.find((item) => String(item.id) === String(projetoId)) || null;
  const valor = useMemo(
    () => ({ projetos, projeto, projetoId, selecionarProjeto, recarregarProjetos, carregandoProjetos }),
    [projetos, projeto, projetoId, carregandoProjetos],
  );
  return <ContextoProjeto.Provider value={valor}>{children}</ContextoProjeto.Provider>;
}

export function useProjeto() {
  const contexto = useContext(ContextoProjeto);
  if (!contexto) throw new Error('useProjeto deve ser usado dentro do provedor.');
  return contexto;
}
