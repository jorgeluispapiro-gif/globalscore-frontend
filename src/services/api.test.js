import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSession, signOut } = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: { auth: { getSession, signOut } },
}));

import { ErroApi, requisicaoApi } from './api';

describe('cliente da API GlobalScore', () => {
  beforeEach(() => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'token-de-teste' } } });
    signOut.mockReset();
    vi.restoreAllMocks();
  });

  it('envia o access token no cabeçalho Bearer', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: 1 }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    await requisicaoApi('/projetos');
    const opcoes = fetchMock.mock.calls[0][1];
    expect(opcoes.headers.get('Authorization')).toBe('Bearer token-de-teste');
  });

  it('encerra a sessão e informa expiração ao receber HTTP 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: 'Token inválido.' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    }));
    await expect(requisicaoApi('/autenticacao/me')).rejects.toMatchObject({ status: 401 });
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('converte indisponibilidade de rede em mensagem compreensível', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(requisicaoApi('/projetos')).rejects.toEqual(expect.objectContaining({
      message: 'Não foi possível conectar à API GlobalScore.',
    }));
    await expect(requisicaoApi('/projetos')).rejects.toBeInstanceOf(ErroApi);
  });
});
