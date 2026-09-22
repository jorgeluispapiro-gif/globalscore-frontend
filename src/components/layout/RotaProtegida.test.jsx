import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ContextoAutenticacao } from '../../hooks/useAutenticacao';
import { RotaProtegida } from './RotaProtegida';

function renderizarRota(valorAutenticacao) {
  return render(
    <ContextoAutenticacao.Provider value={valorAutenticacao}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<p>Tela de login</p>} />
          <Route element={<RotaProtegida />}>
            <Route path="/dashboard" element={<p>Área protegida</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ContextoAutenticacao.Provider>,
  );
}

describe('RotaProtegida', () => {
  it('redireciona o usuário sem sessão para o login', () => {
    renderizarRota({ sessao: null, carregando: false });
    expect(screen.getByText('Tela de login')).toBeInTheDocument();
  });

  it('mantém a tela de restauração enquanto a sessão é consultada', () => {
    renderizarRota({ sessao: null, carregando: true });
    expect(screen.getByText('Restaurando sessão segura')).toBeInTheDocument();
  });

  it('libera a área interna quando existe sessão', () => {
    renderizarRota({ sessao: { user: { id: 'usuario-1' } }, carregando: false });
    expect(screen.getByText('Área protegida')).toBeInTheDocument();
  });
});
