import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAutenticacao } from '../../hooks/useAutenticacao';
import { TelaCarregamento } from '../ui/Estados';

export function RotaProtegida() {
  const { sessao, carregando } = useAutenticacao();
  const localizacao = useLocation();
  if (carregando) return <TelaCarregamento texto="Restaurando sessão segura" />;
  if (!sessao) return <Navigate to="/login" replace state={{ origem: localizacao.pathname }} />;
  return <Outlet />;
}
