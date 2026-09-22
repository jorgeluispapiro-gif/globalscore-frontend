import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { entrar } = vi.hoisted(() => ({ entrar: vi.fn() }));

vi.mock('../hooks/useAutenticacao', () => ({
  useAutenticacao: () => ({ sessao: null, entrar }),
}));

vi.mock('../services/supabase', () => ({ supabaseConfigurado: true }));

import { LoginPage } from './LoginPage';

async function preencherFormulario() {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'gestor@empresa.com' } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-local' } });
  await act(async () => {
    fireEvent.submit(screen.getByRole('button', { name: 'ENTRAR' }).closest('form'));
    await Promise.resolve();
  });
}

describe('LoginPage', () => {
  beforeEach(() => entrar.mockReset());

  it('permite mostrar e ocultar a senha sem alterar seu valor', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    const senha = screen.getByLabelText('Senha');
    fireEvent.change(senha, { target: { value: 'senha-local' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(senha).toHaveAttribute('type', 'text');
    expect(senha).toHaveValue('senha-local');
  });

  it('envia e-mail e senha ao serviço de autenticação', async () => {
    entrar.mockResolvedValue({ access_token: 'token-nao-exibido' });
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    await preencherFormulario();
    await waitFor(() => expect(entrar).toHaveBeenCalledWith('gestor@empresa.com', 'senha-local'));
  });
});
