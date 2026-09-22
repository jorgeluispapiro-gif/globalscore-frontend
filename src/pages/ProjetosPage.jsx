import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { api } from '../services/api';
import { useProjeto } from '../hooks/useProjeto';
import { CabecalhoPagina, EstadoVazio, Mensagem } from '../components/ui/Estados';

const vazio = { nome: '', descricao: '', status: 'RASCUNHO' };

export function ProjetosPage() {
  const { projetos, projetoId, selecionarProjeto, recarregarProjetos } = useProjeto();
  const [formulario, setFormulario] = useState(vazio);
  const [editando, setEditando] = useState(null);
  const [aberto, setAberto] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  function abrirCriacao() { setFormulario(vazio); setEditando(null); setAberto(true); }
  function abrirEdicao(item) { setFormulario({ nome: item.nome, descricao: item.descricao || '', status: item.status }); setEditando(item.id); setAberto(true); }
  async function salvar(evento) {
    evento.preventDefault();
    try {
      if (editando) await api.patch(`/projetos/${editando}`, formulario);
      else await api.post('/projetos', { ...formulario, periodicidade: 'MENSAL' });
      await recarregarProjetos();
      setAberto(false);
      setMensagem({ tipo: 'sucesso', texto: editando ? 'Projeto atualizado.' : 'Projeto criado.' });
    } catch (erro) { setMensagem({ tipo: 'erro', texto: erro.message }); }
  }

  return <div><CabecalhoPagina sobretitulo="Configuração" titulo="Projetos de avaliação" descricao="Organize entidades, indicadores e referências dentro de um contexto gerencial." acoes={<button className="botao botao--primario" onClick={abrirCriacao}><Plus />Novo projeto</button>} />{mensagem && <Mensagem tipo={mensagem.tipo}>{mensagem.texto}</Mensagem>}{aberto && <section className="painel formulario-painel"><div><span className="sobretitulo">{editando ? 'Editar projeto' : 'Novo projeto'}</span><h2>{editando ? 'Atualize os dados administrativos' : 'Defina o contexto da avaliação'}</h2></div><form className="formulario formulario--grade" onSubmit={salvar}><label>Nome<input required value={formulario.nome} onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })} /></label><label>Status<select value={formulario.status} onChange={(e) => setFormulario({ ...formulario, status: e.target.value })}><option>RASCUNHO</option><option>ATIVO</option><option>ARQUIVADO</option></select></label><label className="campo-largo">Descrição<textarea rows="3" value={formulario.descricao} onChange={(e) => setFormulario({ ...formulario, descricao: e.target.value })} /></label><div className="formulario__acoes campo-largo"><button type="button" className="botao botao--secundario" onClick={() => setAberto(false)}>Cancelar</button><button className="botao botao--primario">Salvar projeto</button></div></form></section>}{!projetos.length ? <EstadoVazio titulo="Nenhum projeto cadastrado" descricao="Crie o primeiro projeto de avaliação para organizar seus dados." /> : <div className="cards-lista">{projetos.map((item) => <article key={item.id} className={`card-registro ${String(item.id) === String(projetoId) ? 'card-registro--selecionado' : ''}`}><div><span className={`status status--${item.status.toLowerCase()}`}>{item.status}</span><h2>{item.nome}</h2><p>{item.descricao || 'Sem descrição cadastrada.'}</p></div><dl><div><dt>Periodicidade</dt><dd>{item.periodicidade}</dd></div><div><dt>Atualizado</dt><dd>{new Date(item.atualizado_em).toLocaleDateString('pt-BR')}</dd></div></dl><div className="card-registro__acoes"><button className="botao botao--secundario" onClick={() => selecionarProjeto(item.id)}>{String(item.id) === String(projetoId) ? 'Selecionado' : 'Selecionar'}</button><button className="icone-botao" onClick={() => abrirEdicao(item)} aria-label={`Editar ${item.nome}`}><Pencil /></button></div></article>)}</div>}</div>;
}
