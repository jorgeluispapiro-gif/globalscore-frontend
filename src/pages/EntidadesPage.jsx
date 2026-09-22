import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { api } from '../services/api';
import { useProjeto } from '../hooks/useProjeto';
import { CabecalhoPagina, EstadoVazio, Mensagem } from '../components/ui/Estados';

export function EntidadesPage() {
  const { projetoId } = useProjeto();
  const [entidades, setEntidades] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [formulario, setFormulario] = useState({ codigo: '', nome: '', descricao: '', grupo_id: '', ativa: true });
  const [editando, setEditando] = useState(null);
  const [aberto, setAberto] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  const carregar = useCallback(async () => {
    if (!projetoId) { setEntidades([]); setGrupos([]); return; }
    const [lista, listaGrupos] = await Promise.all([api.get(`/entidades?projeto_id=${projetoId}`), api.get(`/grupos?projeto_id=${projetoId}`)]);
    setEntidades(lista); setGrupos(listaGrupos);
  }, [projetoId]);
  useEffect(() => { carregar().catch((e) => setMensagem({ tipo: 'erro', texto: e.message })); }, [carregar]);
  function nova() { setFormulario({ codigo: '', nome: '', descricao: '', grupo_id: grupos[0]?.id || '', ativa: true }); setEditando(null); setAberto(true); }
  function editar(item) { setFormulario({ codigo: item.codigo, nome: item.nome, descricao: item.descricao || '', grupo_id: item.grupo_id, ativa: item.ativa }); setEditando(item.id); setAberto(true); }
  async function salvar(evento) {
    evento.preventDefault();
    try {
      const dados = { ...formulario, projeto_id: Number(projetoId), grupo_id: Number(formulario.grupo_id) };
      if (editando) await api.patch(`/entidades/${editando}`, { codigo: dados.codigo, nome: dados.nome, descricao: dados.descricao, ativa: dados.ativa });
      else await api.post('/entidades', dados);
      await carregar(); setAberto(false); setMensagem({ tipo: 'sucesso', texto: editando ? 'Entidade atualizada.' : 'Entidade criada.' });
    } catch (erro) { setMensagem({ tipo: 'erro', texto: erro.message }); }
  }

  return <div><CabecalhoPagina sobretitulo="Estrutura comparável" titulo="Entidades" descricao="Cadastre as unidades avaliadas e preserve seu vínculo com o grupo comparável." acoes={<button className="botao botao--primario" onClick={nova} disabled={!projetoId || !grupos.length}><Plus />Nova entidade</button>} />{mensagem && <Mensagem tipo={mensagem.tipo}>{mensagem.texto}</Mensagem>}{!projetoId ? <EstadoVazio titulo="Nenhum projeto selecionado" descricao="Selecione um projeto no cabeçalho." /> : <>{aberto && <section className="painel formulario-painel"><h2>{editando ? 'Editar entidade' : 'Cadastrar entidade'}</h2><form className="formulario formulario--grade" onSubmit={salvar}><label>Código<input required value={formulario.codigo} onChange={(e) => setFormulario({ ...formulario, codigo: e.target.value })} /></label><label>Nome<input required value={formulario.nome} onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })} /></label><label>Grupo comparável<select required disabled={Boolean(editando)} value={formulario.grupo_id} onChange={(e) => setFormulario({ ...formulario, grupo_id: e.target.value })}><option value="">Selecione</option>{grupos.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}</select></label><label className="check-label"><input type="checkbox" checked={formulario.ativa} onChange={(e) => setFormulario({ ...formulario, ativa: e.target.checked })} />Entidade ativa</label><label className="campo-largo">Descrição<textarea rows="2" value={formulario.descricao} onChange={(e) => setFormulario({ ...formulario, descricao: e.target.value })} /></label><div className="formulario__acoes campo-largo"><button type="button" className="botao botao--secundario" onClick={() => setAberto(false)}>Cancelar</button><button className="botao botao--primario">Salvar</button></div></form></section>}{!entidades.length ? <EstadoVazio titulo="Nenhuma entidade cadastrada" descricao={grupos.length ? 'Cadastre a primeira unidade deste projeto.' : 'Cadastre primeiro um grupo comparável para este projeto.'} /> : <div className="tabela-container"><table><thead><tr><th>Código</th><th>Entidade</th><th>Grupo</th><th>Situação</th><th aria-label="Ações" /></tr></thead><tbody>{entidades.map((item) => <tr key={item.id}><td><code>{item.codigo}</code></td><td><strong>{item.nome}</strong><small>{item.descricao}</small></td><td>{grupos.find((g) => g.id === item.grupo_id)?.nome || `Grupo ${item.grupo_id}`}</td><td><span className={`status status--${item.ativa ? 'ativo' : 'inativo'}`}>{item.ativa ? 'ATIVA' : 'INATIVA'}</span></td><td><button className="icone-botao" onClick={() => editar(item)} aria-label={`Editar ${item.nome}`}><Pencil /></button></td></tr>)}</tbody></table></div>}</>}</div>;
}
