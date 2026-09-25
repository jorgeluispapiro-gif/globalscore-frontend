import { useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';

const formularioVazio = (periodo) => ({ periodo: periodo || '', titulo: '', descricao: '' });

function formatarPeriodo(periodo) {
  const [ano, mes] = String(periodo).split('-');
  return `${mes}/${ano}`;
}

export function EntityEvents({ eventos = [], periodoPadrao, aoCriar, aoEditar, aoExcluir }) {
  const [formulario, setFormulario] = useState(null);
  const [eventoEditadoId, setEventoEditadoId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  function iniciarCriacao() {
    setEventoEditadoId(null);
    setFormulario(formularioVazio(periodoPadrao));
    setErro('');
  }

  function iniciarEdicao(evento) {
    setEventoEditadoId(evento.id);
    setFormulario({
      periodo: evento.periodo,
      titulo: evento.titulo,
      descricao: evento.descricao || '',
    });
    setErro('');
  }

  function cancelar() {
    setFormulario(null);
    setEventoEditadoId(null);
    setErro('');
  }

  async function salvar(evento) {
    evento.preventDefault();
    setSalvando(true);
    setErro('');
    try {
      if (eventoEditadoId) await aoEditar(eventoEditadoId, formulario);
      else await aoCriar(formulario);
      cancelar();
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(evento) {
    setSalvando(true);
    setErro('');
    try {
      await aoExcluir(evento.id);
      if (eventoEditadoId === evento.id) cancelar();
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setSalvando(false);
    }
  }

  return <section className="secao-analitica eventos-entidade" aria-labelledby="titulo-eventos">
    <div className="secao-editorial__cabecalho">
      <div><span>Contexto gerencial</span><h2 id="titulo-eventos">Eventos registrados</h2></div>
      {!formulario && <button type="button" className="botao botao--texto eventos-entidade__registrar nao-imprimir" onClick={iniciarCriacao}><Plus aria-hidden="true" />Registrar evento</button>}
    </div>

    {formulario && <form className="evento-formulario nao-imprimir" onSubmit={salvar}>
      <label>Período<input type="month" required value={formulario.periodo} onChange={(evento) => setFormulario({ ...formulario, periodo: evento.target.value })} /></label>
      <label>Título<input required maxLength="160" value={formulario.titulo} onChange={(evento) => setFormulario({ ...formulario, titulo: evento.target.value })} /></label>
      <label className="evento-formulario__descricao">Descrição opcional<textarea rows="2" value={formulario.descricao} onChange={(evento) => setFormulario({ ...formulario, descricao: evento.target.value })} /></label>
      {erro && <p className="evento-formulario__erro" role="alert">{erro}</p>}
      <div className="evento-formulario__acoes"><button type="button" className="botao botao--texto" onClick={cancelar} disabled={salvando}><X aria-hidden="true" />Cancelar</button><button className="botao botao--primario" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar evento'}</button></div>
    </form>}

    {!eventos.length && !formulario && <p className="eventos-entidade__vazio">Nenhum evento registrado para esta entidade.</p>}
    {!!eventos.length && <ol className="eventos-entidade__lista">{eventos.map((evento) => <li key={evento.id}>
      <time dateTime={evento.periodo}>{formatarPeriodo(evento.periodo)}</time>
      <div><strong>{evento.titulo}</strong>{evento.descricao && <p>{evento.descricao}</p>}</div>
      <div className="eventos-entidade__acoes nao-imprimir"><button type="button" className="icone-botao" onClick={() => iniciarEdicao(evento)} aria-label={`Editar evento ${evento.titulo}`}><Pencil /></button><button type="button" className="icone-botao icone-botao--perigo" onClick={() => excluir(evento)} disabled={salvando} aria-label={`Excluir evento ${evento.titulo}`}><Trash2 /></button></div>
    </li>)}</ol>}
  </section>;
}
