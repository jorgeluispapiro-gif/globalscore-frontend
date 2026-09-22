import { supabase } from './supabase';

const urlBase = (import.meta.env.VITE_GLOBALSCORE_API_URL || '/api').replace(/\/$/, '');

export class ErroApi extends Error {
  constructor(mensagem, status = 0, dados = null) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
    this.dados = dados;
  }
}

function mensagemPorStatus(status) {
  if (status === 401) return 'Sua sessão expirou. Entre novamente.';
  if (status === 404) return 'O recurso solicitado não foi encontrado.';
  if (status === 409) return 'A operação entrou em conflito com dados existentes.';
  if (status === 422) return 'Revise os campos informados.';
  if (status >= 500) return 'O serviço está temporariamente indisponível.';
  return 'Não foi possível concluir a operação.';
}

export async function requisicaoApi(caminho, opcoes = {}) {
  const { data } = supabase
    ? await supabase.auth.getSession()
    : { data: { session: null } };
  const token = data.session?.access_token;
  const cabecalhos = new Headers(opcoes.headers || {});
  if (token) cabecalhos.set('Authorization', `Bearer ${token}`);
  if (opcoes.body && !(opcoes.body instanceof FormData)) {
    cabecalhos.set('Content-Type', 'application/json');
  }

  let resposta;
  try {
    resposta = await fetch(`${urlBase}${caminho}`, { ...opcoes, headers: cabecalhos });
  } catch (erro) {
    throw new ErroApi('Não foi possível conectar à API GlobalScore.', 0, erro);
  }

  const tipo = resposta.headers.get('content-type') || '';
  const dadosResposta = tipo.includes('application/json') ? await resposta.json() : null;
  if (!resposta.ok) {
    if (resposta.status === 401) {
      await supabase?.auth.signOut();
      window.dispatchEvent(new CustomEvent('globalscore:sessao-expirada'));
    }
    throw new ErroApi(
      dadosResposta?.message || mensagemPorStatus(resposta.status),
      resposta.status,
      dadosResposta,
    );
  }
  return dadosResposta;
}

export const api = {
  get: (caminho) => requisicaoApi(caminho),
  post: (caminho, dados) => requisicaoApi(caminho, {
    method: 'POST',
    body: dados instanceof FormData ? dados : JSON.stringify(dados || {}),
  }),
  patch: (caminho, dados) => requisicaoApi(caminho, {
    method: 'PATCH',
    body: JSON.stringify(dados),
  }),
  delete: (caminho) => requisicaoApi(caminho, { method: 'DELETE' }),
};
