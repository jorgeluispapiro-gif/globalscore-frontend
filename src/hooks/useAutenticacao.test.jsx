import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSession, onAuthStateChange, signInWithPassword, signOut } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('../services/supabase', () => ({
  supabaseConfigurado: true,
  exigirSupabase: () => ({ auth: { signInWithPassword } }),
  supabase: { auth: { getSession, onAuthStateChange, signOut } },
}));

import { ProvedorAutenticacao, useAutenticacao } from './useAutenticacao';

function LeitorSessao() {
  const { sessao, carregando, sair } = useAutenticacao();
  if (carregando) return <span>consultando</span>;
  return <button onClick={sair}>{sessao?.user?.email || 'sem sessão'}</button>;
}

describe('ProvedorAutenticacao', () => {
  beforeEach(() => {
    getSession.mockReset();
    onAuthStateChange.mockReset();
    signInWithPassword.mockReset();
    signOut.mockReset();
    onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  });

  it('restaura a sessão persistida quando a aplicação inicia', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { email: 'gestor@empresa.com' } } } });
    render(<ProvedorAutenticacao><LeitorSessao /></ProvedorAutenticacao>);
    expect(await screen.findByRole('button', { name: 'gestor@empresa.com' })).toBeInTheDocument();
  });

  it('encerra a sessão por meio do Supabase', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { email: 'gestor@empresa.com' } } } });
    render(<ProvedorAutenticacao><LeitorSessao /></ProvedorAutenticacao>);
    const botao = await screen.findByRole('button', { name: 'gestor@empresa.com' });
    botao.click();
    await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
    expect(await screen.findByRole('button', { name: 'sem sessão' })).toBeInTheDocument();
  });

  it('converte credenciais recusadas em mensagem segura', async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    signInWithPassword.mockResolvedValue({ data: null, error: new Error('Invalid login credentials') });
    const Wrapper = ({ children }) => <ProvedorAutenticacao>{children}</ProvedorAutenticacao>;
    const { result } = renderHook(() => useAutenticacao(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.carregando).toBe(false));
    await expect(result.current.entrar('gestor@empresa.com', 'senha-incorreta'))
      .rejects.toThrow('E-mail ou senha inválidos');
  });
});
