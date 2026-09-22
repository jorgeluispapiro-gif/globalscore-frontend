import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const ContextoProjeto = createContext(null);

export function ProvedorProjeto({ children }) {
  const [projetos, setProjetos] = useState([]);
  const [projetoId, setProjetoId] = useState(() => localStorage.getItem('globalscore:projeto-id') || '');
  const [carregandoProjetos, setCarregando] = useState(true);

  const selecionarProjeto = useCallback((id) => {
    const valor = id ? String(id) : '';
    setProjetoId(valor);
    if (valor) localStorage.setItem('globalscore:projeto-id', valor);
    else localStorage.removeItem('globalscore:projeto-id');
  }, []);

  const recarregarProjetos = useCallback(async () => {
    setCarregando(true);
    try {
      const dados = await api.get('/projetos');
      setProjetos(dados);
      setProjetoId((atual) => {
        const existe = dados.some((item) => String(item.id) === String(atual));
        if (existe || !dados[0]) return atual;
        const primeiroId = String(dados[0].id);
        localStorage.setItem('globalscore:projeto-id', primeiroId);
        return primeiroId;
      });
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { recarregarProjetos().catch(() => setCarregando(false)); }, [recarregarProjetos]);

  const projeto = projetos.find((item) => String(item.id) === String(projetoId)) || null;
  const valor = useMemo(
    () => ({ projetos, projeto, projetoId, selecionarProjeto, recarregarProjetos, carregandoProjetos }),
    [projetos, projeto, projetoId, selecionarProjeto, recarregarProjetos, carregandoProjetos],
  );
  return <ContextoProjeto.Provider value={valor}>{children}</ContextoProjeto.Provider>;
}

export function useProjeto() {
  const contexto = useContext(ContextoProjeto);
  if (!contexto) throw new Error('useProjeto deve ser usado dentro do provedor.');
  return contexto;
}
