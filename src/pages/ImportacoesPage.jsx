import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  FileSpreadsheet,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import { useProjeto } from '../hooks/useProjeto';
import { api } from '../services/api';
import { CabecalhoPagina, EstadoVazio, Mensagem } from '../components/ui/Estados';
import {
  calcularPesoPlanejado,
  criarDadosNovoIndicador,
  montarColunasDoPayload,
  resumirMetricas,
  SELECAO_INDICADOR_EXISTENTE,
  SELECAO_INDICADOR_NOVO,
  validarIndicadoresMapeados,
} from '../utils/mapeamentoImportacao';
import { agruparEntidadesDesconhecidas, aplicarCriacaoEmLote, localizarGrupoComMesmoNome, montarDecisoesEntidades, validarDecisoesEntidades } from '../utils/entidadesImportacao';
import { CONFIGURACAO_INICIAL_IMPORTACAO, restaurarConfiguracaoImportacao, restaurarDecisoesEntidades, restaurarMapeamentosImportacao } from '../utils/retomadaImportacao';

const configuracaoInicial = CONFIGURACAO_INICIAL_IMPORTACAO;

function sugerirPapel(cabecalho) {
  const nome = String(cabecalho || '').toLocaleLowerCase('pt-BR');
  if (nome.includes('código') || nome.includes('codigo')) return 'CODIGO_ENTIDADE';
  if (nome.includes('filial') || nome.includes('unidade') || nome.includes('entidade')) return 'NOME_ENTIDADE';
  if (nome.includes('período') || nome.includes('periodo') || nome.includes('mês') || nome.includes('mes')) return 'PERIODO';
  return 'IGNORAR';
}

function ListaOcorrencias({ titulo, itens, tipo }) {
  if (!itens?.length) return null;
  const Icone = tipo === 'erro' ? ShieldAlert : AlertTriangle;
  return (
    <section className={`ocorrencias ocorrencias--${tipo}`}>
      <div className="ocorrencias__titulo">
        <Icone aria-hidden="true" />
        <div><strong>{titulo}</strong><span>{itens.length} ocorrência(s)</span></div>
      </div>
      <ul>
        {itens.map((item, indice) => (
          <li key={`${item.tipo}-${item.linha}-${item.coluna}-${indice}`}>
            <strong>{String(item.tipo || tipo).replaceAll('_', ' ')}</strong>
            <span>{item.mensagem || `Valor ${item.valor ?? item.valor_original ?? ''}`}</span>
            {(item.linha || item.coluna) && <small>Linha {item.linha || '—'} · Coluna {item.coluna || '—'}</small>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ImportacoesPage() {
  const { projeto, projetoId } = useProjeto();
  const [arquivo, setArquivo] = useState(null);
  const [lote, setLote] = useState(null);
  const [indicadores, setIndicadores] = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [todosGrupos, setTodosGrupos] = useState([]);
  const [decisoesEntidades, setDecisoesEntidades] = useState({});
  const [grupoLote, setGrupoLote] = useState('');
  const [errosEntidades, setErrosEntidades] = useState({});
  const [formularioGrupoAberto, setFormularioGrupoAberto] = useState(false);
  const [novoGrupo, setNovoGrupo] = useState({ nome: '', descricao: '' });
  const [erroGrupo, setErroGrupo] = useState('');
  const [grupoDuplicado, setGrupoDuplicado] = useState(null);
  const [importacoesPendentes, setImportacoesPendentes] = useState([]);
  const [carregandoAuxiliares, setCarregandoAuxiliares] = useState(false);
  const [descarteAlvo, setDescarteAlvo] = useState(null);
  const [erroRetomadaId, setErroRetomadaId] = useState(null);
  const [configuracao, setConfiguracao] = useState(configuracaoInicial);
  const [mapeamentos, setMapeamentos] = useState([]);
  const [validacao, setValidacao] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const [processando, setProcessando] = useState(false);
  const [errosMapeamento, setErrosMapeamento] = useState({});
  const [modoConfiguracao, setModoConfiguracao] = useState('MANUAL');
  const [reconhecimentoPerfil, setReconhecimentoPerfil] = useState(null);
  const [perfilSelecionadoId, setPerfilSelecionadoId] = useState('');
  const [formularioPerfilAberto, setFormularioPerfilAberto] = useState(false);
  const [nomePerfil, setNomePerfil] = useState('');
  const [erroNomePerfil, setErroNomePerfil] = useState('');
  const [perfilSalvo, setPerfilSalvo] = useState(null);

  useEffect(() => {
    setArquivo(null);
    setLote(null);
    setValidacao(null);
    setResultado(null);
    setMapeamentos([]);
    setErrosMapeamento({});
    setDecisoesEntidades({});
    setGrupoLote('');
    setErrosEntidades({});
    setFormularioGrupoAberto(false);
    setNovoGrupo({ nome: '', descricao: '' });
    setErroGrupo('');
    setGrupoDuplicado(null);
    setImportacoesPendentes([]);
    setDescarteAlvo(null);
    setErroRetomadaId(null);
    setModoConfiguracao('MANUAL');
    setReconhecimentoPerfil(null);
    setPerfilSelecionadoId('');
    setFormularioPerfilAberto(false);
    setNomePerfil('');
    setErroNomePerfil('');
    setPerfilSalvo(null);
    if (!projetoId) {
      setIndicadores([]);
      setEntidades([]);
      setGrupos([]);
      setTodosGrupos([]);
      setCarregandoAuxiliares(false);
      return;
    }
    setCarregandoAuxiliares(true);
    Promise.all([
      api.get(`/indicadores?projeto_id=${projetoId}`),
      api.get(`/entidades?projeto_id=${projetoId}`),
      api.get(`/grupos?projeto_id=${projetoId}`),
      api.get(`/importacoes?projeto_id=${projetoId}&pendentes=true`),
    ])
      .then(([dadosIndicadores, dadosEntidades, dadosGrupos, dadosImportacoes]) => {
        setIndicadores(dadosIndicadores.filter((item) => item.ativo === true));
        setEntidades(dadosEntidades.filter((item) => item.ativa === true));
        setTodosGrupos(dadosGrupos);
        setGrupos(dadosGrupos.filter((item) => item.ativo === true));
        setImportacoesPendentes(dadosImportacoes);
      })
      .catch((erro) => setMensagem({ tipo: 'erro', texto: erro.message }))
      .finally(() => setCarregandoAuxiliares(false));
  }, [projetoId]);

  const preview = useMemo(() => {
    if (!lote?.inspecao) return [];
    if (lote.tipo_arquivo === 'CSV') return lote.inspecao.preview || [];
    const aba = lote.inspecao.abas?.find((item) => item.nome === configuracao.aba);
    return aba?.preview || lote.inspecao.abas?.[0]?.preview || [];
  }, [lote, configuracao.aba]);

  const cabecalhos = preview[0] || [];
  const resumoMetricas = useMemo(
    () => resumirMetricas(mapeamentos, indicadores),
    [mapeamentos, indicadores],
  );
  const pesoPlanejado = useMemo(
    () => calcularPesoPlanejado(indicadores, mapeamentos),
    [indicadores, mapeamentos],
  );
  const entidadesDesconhecidas = useMemo(
    () => agruparEntidadesDesconhecidas(validacao?.erros || validacao?.problemas || []),
    [validacao],
  );

  function prepararMapeamento(linhas, tipoArquivo, inspecao) {
    const colunas = linhas[0] || [];
    setMapeamentos(colunas.map((nome, indice) => {
      const selecao = sugerirPapel(nome);
      return {
        indice_coluna: indice + 1,
        nome: String(nome || `Coluna ${indice + 1}`),
        selecao,
        candidata_metrica: selecao === 'IGNORAR',
        indicador_existente_id: '',
        novo_indicador: criarDadosNovoIndicador(nome),
      };
    }));
    setConfiguracao((atual) => ({
      ...atual,
      delimitador: tipoArquivo === 'CSV' ? (inspecao.sugestao_delimitador || ';') : atual.delimitador,
      aba: tipoArquivo === 'XLSX' ? (inspecao.abas?.[0]?.nome || '') : '',
    }));
  }

  async function enviarArquivo(evento) {
    evento.preventDefault();
    if (!arquivo || !projetoId) return;
    setProcessando(true);
    setMensagem(null);
    setModoConfiguracao('RECONHECENDO');
    setReconhecimentoPerfil(null);
    setPerfilSelecionadoId('');
    try {
      const dados = new FormData();
      dados.append('projeto_id', projetoId);
      dados.append('arquivo', arquivo);
      const resposta = await api.post('/importacoes', dados);
      setLote(resposta);
      setImportacoesPendentes((atuais) => [resposta, ...atuais.filter((item) => item.id !== resposta.id)]);
      const linhas = resposta.tipo_arquivo === 'CSV'
        ? resposta.inspecao.preview
        : resposta.inspecao.abas?.[0]?.preview || [];
      prepararMapeamento(linhas, resposta.tipo_arquivo, resposta.inspecao);
      try {
        const reconhecimento = await api.post(`/importacoes/${resposta.id}/reconhecer-perfil`);
        setReconhecimentoPerfil(reconhecimento);
        if (reconhecimento.resultado === 'COMPATIVEL') {
          setPerfilSelecionadoId(String(reconhecimento.perfil_sugerido.id));
          setModoConfiguracao('PERFIL');
          setMensagem(null);
        } else if (reconhecimento.resultado === 'AMBIGUO') {
          setModoConfiguracao('PERFIL');
          setMensagem({ tipo: 'alerta', texto: 'Mais de uma configuração corresponde a este arquivo.' });
        } else {
          setModoConfiguracao('MANUAL');
          setMensagem({ tipo: 'sucesso', texto: 'Arquivo recebido. Confirme como cada coluna deve ser interpretada.' });
        }
      } catch (erroReconhecimento) {
        setModoConfiguracao('MANUAL');
        setMensagem({
          tipo: 'erro',
          texto: `${erroReconhecimento.message} Você ainda pode mapear o arquivo manualmente.`,
        });
      }
    } catch (erro) {
      setModoConfiguracao('MANUAL');
      setMensagem({ tipo: 'erro', texto: erro.message });
    } finally {
      setProcessando(false);
    }
  }

  function alterarMapeamento(indice, selecao) {
    setMapeamentos((atuais) => atuais.map((item) => (
      item.indice_coluna === indice ? { ...item, selecao } : item
    )));
    setErrosMapeamento((atuais) => ({ ...atuais, [indice]: undefined }));
  }

  function alterarIndicadorExistente(indice, indicadorId) {
    setMapeamentos((atuais) => atuais.map((item) => (
      item.indice_coluna === indice ? { ...item, indicador_existente_id: indicadorId } : item
    )));
    setErrosMapeamento((atuais) => ({ ...atuais, [indice]: undefined }));
  }

  function alterarNovoIndicador(indice, campo, valor) {
    setMapeamentos((atuais) => atuais.map((item) => (
      item.indice_coluna === indice
        ? { ...item, novo_indicador: { ...item.novo_indicador, [campo]: valor } }
        : item
    )));
    setErrosMapeamento((atuais) => ({ ...atuais, [indice]: undefined }));
  }

  function reconstruirEstadoPersistido(importacao, inspecao) {
    const configuracaoRestaurada = restaurarConfiguracaoImportacao(
      importacao.configuracao_leitura,
      inspecao,
      importacao.tipo_arquivo,
    );
    const previewRestaurado = importacao.tipo_arquivo === 'CSV'
      ? inspecao.preview || []
      : inspecao.abas?.find((item) => item.nome === configuracaoRestaurada.aba)?.preview
        || inspecao.abas?.[0]?.preview || [];
    const mapeamentosRestaurados = restaurarMapeamentosImportacao(
      importacao.mapeamento,
      previewRestaurado[0] || [],
    );
    const decisoesRestauradas = restaurarDecisoesEntidades(
      importacao.mapeamento?.decisoes_entidades,
    );
    return {
      configuracaoRestaurada,
      previewRestaurado,
      mapeamentosRestaurados,
      decisoesRestauradas,
    };
  }

  function montarPayload(loteAtual = lote, configuracaoAtual = configuracao, mapeamentosAtuais = mapeamentos, decisoesAtuais = decisoesEntidades) {
    const colunas = montarColunasDoPayload(mapeamentosAtuais);
    const leitura = {
      linha_inicial: Number(configuracaoAtual.linha_inicial),
      linhas_cabecalho: configuracaoAtual.linhas_cabecalho.map(Number),
      colunas_utilizadas: mapeamentosAtuais.map((item) => item.indice_coluna),
      formato_periodo: configuracaoAtual.formato_periodo,
      formato_numerico: {
        separador_decimal: configuracaoAtual.separador_decimal,
        separador_milhar: configuracaoAtual.separador_milhar,
        percentual_como: configuracaoAtual.percentual_como,
      },
    };
    if (loteAtual.tipo_arquivo === 'CSV') leitura.delimitador = configuracaoAtual.delimitador;
    else leitura.aba = configuracaoAtual.aba;
    return { configuracao_leitura: leitura, mapeamento: { formato: 'LARGO', colunas, decisoes_entidades: montarDecisoesEntidades(decisoesAtuais) } };
  }

  function mapearManualmente() {
    setModoConfiguracao('MANUAL');
    setMensagem({ tipo: 'sucesso', texto: 'Mapeamento manual disponível para este lote.' });
  }

  async function usarConfiguracaoConhecida() {
    if (!perfilSelecionadoId) return;
    setProcessando(true);
    setMensagem(null);
    try {
      const respostaAplicacao = await api.post(`/importacoes/${lote.id}/aplicar-perfil`, {
        perfil_id: Number(perfilSelecionadoId),
      });
      const importacaoAplicada = respostaAplicacao.importacao;
      const loteAplicado = { ...lote, ...importacaoAplicada, inspecao: lote.inspecao };
      const estado = reconstruirEstadoPersistido(importacaoAplicada, lote.inspecao);
      setLote(loteAplicado);
      setConfiguracao(estado.configuracaoRestaurada);
      setMapeamentos(estado.mapeamentosRestaurados);
      setDecisoesEntidades(estado.decisoesRestauradas);
      setModoConfiguracao('APLICADO');

      try {
        const respostaValidacao = await api.post(
          `/importacoes/${lote.id}/validar`,
          {
            configuracao_leitura: importacaoAplicada.configuracao_leitura,
            mapeamento: importacaoAplicada.mapeamento,
          },
        );
        setValidacao(respostaValidacao);
        setMensagem({
          tipo: respostaValidacao.quantidade_erros
            ? 'erro'
            : (respostaValidacao.quantidade_alertas ? 'alerta' : 'sucesso'),
          texto: respostaValidacao.quantidade_erros
            ? 'A configuração foi aplicada. Revise as pendências encontradas.'
            : 'Configuração aplicada e validação concluída.',
        });
      } catch (erroValidacao) {
        setModoConfiguracao('MANUAL');
        setMensagem({
          tipo: 'erro',
          texto: `${erroValidacao.message} Revise o mapeamento manualmente.`,
        });
      }
    } catch (erro) {
      setMensagem({
        tipo: 'erro',
        texto: erro.status === 409
          ? `${erro.message} Você pode mapear o arquivo manualmente.`
          : erro.message,
      });
    } finally {
      setProcessando(false);
    }
  }

  async function continuarImportacao(importacao) {
    setProcessando(true);
    setMensagem(null);
    setErroRetomadaId(null);
    try {
      const inspecao = await api.get(`/importacoes/${importacao.id}/inspecao`);
      const loteRestaurado = { ...importacao, inspecao };
      const estado = importacao.mapeamento?.colunas?.length
        ? reconstruirEstadoPersistido(importacao, inspecao)
        : null;
      const configuracaoRestaurada = estado?.configuracaoRestaurada
        || restaurarConfiguracaoImportacao(importacao.configuracao_leitura, inspecao, importacao.tipo_arquivo);
      const previewRestaurado = estado?.previewRestaurado || (
        importacao.tipo_arquivo === 'CSV'
          ? inspecao.preview || []
          : inspecao.abas?.find((item) => item.nome === configuracaoRestaurada.aba)?.preview
            || inspecao.abas?.[0]?.preview || []
      );
      setLote(loteRestaurado);
      setConfiguracao(configuracaoRestaurada);
      setResultado(null);
      if (importacao.mapeamento?.colunas?.length) {
        const { mapeamentosRestaurados, decisoesRestauradas } = estado;
        setMapeamentos(mapeamentosRestaurados);
        setDecisoesEntidades(decisoesRestauradas);
        setModoConfiguracao(importacao.perfil_importacao_id ? 'APLICADO' : 'MANUAL');
        try {
          const resposta = await api.post(
            `/importacoes/${importacao.id}/validar`,
            montarPayload(loteRestaurado, configuracaoRestaurada, mapeamentosRestaurados, decisoesRestauradas),
          );
          setValidacao(resposta);
          setMensagem({ tipo: resposta.quantidade_erros ? 'erro' : 'sucesso', texto: resposta.quantidade_erros ? 'A importação foi retomada. Revise as pendências encontradas.' : 'Importação retomada e revalidada.' });
        } catch (erro) {
          setValidacao(null);
          setMensagem({ tipo: 'erro', texto: erro.message });
        }
      } else {
        setValidacao(null);
        setModoConfiguracao('MANUAL');
        prepararMapeamento(previewRestaurado, importacao.tipo_arquivo, inspecao);
        setConfiguracao(configuracaoRestaurada);
        setMensagem({ tipo: 'sucesso', texto: 'Importação retomada. Confirme o mapeamento das colunas.' });
      }
    } catch (erro) {
      setErroRetomadaId(importacao.id);
      setMensagem({ tipo: 'erro', texto: erro.status === 409 ? 'Este arquivo não está mais disponível para continuar a importação.' : erro.message });
    } finally {
      setProcessando(false);
    }
  }

  function limparLoteAtivo() {
    setArquivo(null);
    setLote(null);
    setValidacao(null);
    setResultado(null);
    setMapeamentos([]);
    setDecisoesEntidades({});
    setErrosMapeamento({});
    setErrosEntidades({});
    setModoConfiguracao('MANUAL');
    setReconhecimentoPerfil(null);
    setPerfilSelecionadoId('');
  }

  async function confirmarDescarte() {
    if (!descarteAlvo) return;
    setProcessando(true);
    try {
      await api.post(`/importacoes/${descarteAlvo.id}/anular`);
      setImportacoesPendentes((atuais) => atuais.filter((item) => item.id !== descarteAlvo.id));
      if (lote?.id === descarteAlvo.id) limparLoteAtivo();
      setDescarteAlvo(null);
      setErroRetomadaId(null);
      setMensagem({ tipo: 'sucesso', texto: 'Importação descartada.' });
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: erro.message });
    } finally {
      setProcessando(false);
    }
  }

  async function validar() {
    const erros = validarIndicadoresMapeados(mapeamentos);
    if (Object.keys(erros).length) {
      setErrosMapeamento(erros);
      setMensagem({ tipo: 'erro', texto: 'Revise os campos destacados antes de validar.' });
      return;
    }
    setProcessando(true);
    setMensagem(null);
    try {
      const resposta = await api.post(`/importacoes/${lote.id}/validar`, montarPayload());
      setValidacao(resposta);
      setMensagem({
        tipo: resposta.quantidade_erros ? 'erro' : (resposta.quantidade_alertas ? 'alerta' : 'sucesso'),
        texto: resposta.quantidade_erros
          ? 'A validação encontrou erros que precisam ser corrigidos.'
          : 'Validação concluída. Revise o resumo antes de confirmar.',
      });
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: erro.message });
    } finally {
      setProcessando(false);
    }
  }

  function alterarDecisaoEntidade(codigo, alteracao) {
    setDecisoesEntidades((atuais) => ({ ...atuais, [codigo]: { ...atuais[codigo], ...alteracao } }));
    setErrosEntidades((atuais) => ({ ...atuais, [codigo]: undefined }));
  }

  function revalidarEntidades() {
    const erros = validarDecisoesEntidades(entidadesDesconhecidas, decisoesEntidades);
    if (Object.keys(erros).length > 0) {
      setErrosEntidades(erros);
      setMensagem({ tipo: 'erro', texto: 'Revise as entidades pendentes antes de revalidar.' });
      return;
    }
    setErrosEntidades({});
    validar();
  }

  function abrirFormularioGrupo() {
    setFormularioGrupoAberto(true);
    setNovoGrupo({ nome: '', descricao: '' });
    setErroGrupo('');
    setGrupoDuplicado(null);
  }

  function usarGrupoExistente() {
    if (!grupoDuplicado?.ativo) return;
    setGrupoLote(String(grupoDuplicado.id));
    setFormularioGrupoAberto(false);
    setErroGrupo('');
    setGrupoDuplicado(null);
    setMensagem({ tipo: 'sucesso', texto: 'Grupo existente selecionado.' });
  }

  async function criarGrupo(evento) {
    evento.preventDefault();
    const nome = novoGrupo.nome.trim();
    if (!nome) {
      setErroGrupo('Informe o nome do grupo.');
      return;
    }
    const existente = localizarGrupoComMesmoNome(todosGrupos, nome);
    if (existente) {
      setGrupoDuplicado(existente);
      setErroGrupo(existente.ativo
        ? 'Já existe um grupo com esse nome neste projeto.'
        : 'Já existe um grupo inativo com esse nome.');
      return;
    }
    setProcessando(true);
    setErroGrupo('');
    try {
      const grupoCriado = await api.post('/grupos', {
        projeto_id: Number(projetoId),
        nome,
        descricao: novoGrupo.descricao.trim(),
        ativo: true,
      });
      setTodosGrupos((atuais) => [...atuais, grupoCriado]);
      setGrupos((atuais) => [...atuais, grupoCriado]);
      setGrupoLote(String(grupoCriado.id));
      setFormularioGrupoAberto(false);
      setNovoGrupo({ nome: '', descricao: '' });
      setMensagem({ tipo: 'sucesso', texto: 'Grupo criado e selecionado.' });
    } catch (erro) {
      setErroGrupo(erro.message || 'Não foi possível criar o grupo. Tente novamente.');
    } finally {
      setProcessando(false);
    }
  }

  async function confirmar() {
    setProcessando(true);
    setMensagem(null);
    try {
      const resposta = await api.post(`/importacoes/${lote.id}/confirmar`, {
        confirmar_alertas: validacao?.quantidade_alertas > 0,
      });
      setResultado(resposta);
      setImportacoesPendentes((atuais) => atuais.filter((item) => item.id !== lote.id));
      setMensagem({ tipo: 'sucesso', texto: 'Importação concluída. As observações foram registradas com rastreabilidade.' });
    } catch (erro) {
      setMensagem({ tipo: 'erro', texto: erro.message });
    } finally {
      setProcessando(false);
    }
  }

  async function salvarConfiguracao(evento) {
    evento.preventDefault();
    const nome = nomePerfil.trim();
    if (!nome) {
      setErroNomePerfil('Informe o nome da configuração.');
      return;
    }
    setProcessando(true);
    setErroNomePerfil('');
    try {
      const perfil = await api.post('/perfis-importacao', {
        importacao_id: resultado.id,
        nome,
      });
      setPerfilSalvo(perfil);
      setFormularioPerfilAberto(false);
      setMensagem(null);
    } catch (erro) {
      setErroNomePerfil(erro.message);
    } finally {
      setProcessando(false);
    }
  }

  function reiniciar() {
    setArquivo(null);
    setLote(null);
    setValidacao(null);
    setResultado(null);
    setMapeamentos([]);
    setErrosMapeamento({});
    setDecisoesEntidades({});
    setGrupoLote('');
    setErrosEntidades({});
    setFormularioGrupoAberto(false);
    setNovoGrupo({ nome: '', descricao: '' });
    setErroGrupo('');
    setGrupoDuplicado(null);
    setModoConfiguracao('MANUAL');
    setReconhecimentoPerfil(null);
    setPerfilSelecionadoId('');
    setFormularioPerfilAberto(false);
    setNomePerfil('');
    setErroNomePerfil('');
    setPerfilSalvo(null);
    setMensagem(null);
  }

  return (
    <div>
      <CabecalhoPagina
        sobretitulo="Entrada de dados"
        titulo="Importação assistida"
        descricao="O sistema lê o arquivo, mas o gestor confirma o significado das colunas antes de qualquer gravação."
      />
      <ol className="etapas-importacao" aria-label="Etapas da importação">
        {['Arquivo', 'Mapeamento', 'Validação', 'Resultado'].map((nome, indice) => {
          const etapaAtual = resultado ? 3 : validacao ? 2 : lote ? 1 : 0;
          return <li key={nome} className={indice <= etapaAtual ? 'etapa--ativa' : ''}><span>{indice + 1}</span><strong>{nome}</strong></li>;
        })}
      </ol>
      {mensagem && <Mensagem tipo={mensagem.tipo}>{mensagem.texto}</Mensagem>}
      {!projetoId && <EstadoVazio titulo="Nenhum projeto selecionado" descricao="Selecione o projeto que receberá as observações importadas." />}

      {projetoId && !lote && carregandoAuxiliares && <section className="painel"><p>Carregando importações em andamento…</p></section>}
      {projetoId && !lote && !carregandoAuxiliares && importacoesPendentes.length > 0 && <section className="painel importacoes-pendentes"><div className="painel__cabecalho painel__cabecalho--simples"><div><span className="sobretitulo">Retomar trabalho</span><h2>Importações em andamento</h2><p>Escolha conscientemente qual lote deseja continuar ou descartar.</p></div></div><div className="importacoes-pendentes__lista">{importacoesPendentes.map((item) => <article key={item.id}><div><strong>{item.nome_arquivo_original}</strong><span>{item.tipo_arquivo} · {item.status}</span><small>{item.criado_em ? new Date(item.criado_em).toLocaleString('pt-BR') : 'Data não informada'} · {item.quantidade_linhas_lidas ?? 0} linha(s) · {item.quantidade_erros ?? 0} erro(s) · {item.quantidade_alertas ?? 0} alerta(s)</small>{erroRetomadaId === item.id && <em>O arquivo deste lote precisa ser descartado para sair da lista.</em>}</div><div className="formulario__acoes"><button className="botao botao--primario" disabled={processando || carregandoAuxiliares || erroRetomadaId === item.id} onClick={() => continuarImportacao(item)}>CONTINUAR</button><button className="botao botao--texto" onClick={() => setDescarteAlvo(item)}>DESCARTAR</button></div></article>)}</div></section>}

      {descarteAlvo && <section className="painel confirmacao-descarte" role="dialog" aria-label="Descartar importação"><h2>Descartar esta importação?</h2><p>Os dados ainda não confirmados e o arquivo temporário serão removidos.</p><div className="formulario__acoes"><button className="botao botao--texto" onClick={() => setDescarteAlvo(null)}>CANCELAR</button><button className="botao botao--primario" disabled={processando} onClick={confirmarDescarte}>DESCARTAR IMPORTAÇÃO</button></div></section>}

      {projetoId && !lote && !carregandoAuxiliares && (
        <section className="painel painel-upload">
          <div className="painel-upload__icone"><Upload aria-hidden="true" /></div>
          <div><span className="sobretitulo">Etapa 1</span><h2>Selecione a planilha</h2><p>Projeto de destino: <strong>{projeto?.nome}</strong>. Formatos aceitos: CSV ou XLSX, até 10 MB.</p></div>
          <form className="formulario" onSubmit={enviarArquivo}>
            <label>Arquivo de dados<input type="file" required accept=".csv,.xlsx" onChange={(evento) => setArquivo(evento.target.files?.[0] || null)} /></label>
            <button className="botao botao--primario" disabled={!arquivo || processando}><FileSearch />{processando ? 'ANALISANDO…' : 'ANALISAR ARQUIVO'}</button>
          </form>
        </section>
      )}

      {lote && !resultado && (
        <>
          <section className="painel arquivo-resumo">
            <FileSpreadsheet aria-hidden="true" />
            <div><span className="sobretitulo">Arquivo analisado</span><h2>{lote.nome_arquivo_original}</h2><p>{lote.tipo_arquivo} · Lote #{lote.id} · nenhuma observação gravada nesta etapa</p></div>
            <button className="botao botao--texto" onClick={() => setDescarteAlvo(lote)}>DESCARTAR E TROCAR ARQUIVO</button>
          </section>
          <section className="painel">
            <div className="painel__cabecalho painel__cabecalho--simples"><div><span className="sobretitulo">Preview</span><h2>Confira a região de dados</h2><p>As dez primeiras linhas são exibidas somente para orientar o mapeamento.</p></div></div>
            <div className="configuracao-importacao">
              {lote.tipo_arquivo === 'XLSX' && <label>Aba<select value={configuracao.aba} onChange={(evento) => setConfiguracao({ ...configuracao, aba: evento.target.value })}>{lote.inspecao.abas.map((aba) => <option key={aba.nome}>{aba.nome}</option>)}</select></label>}
              {lote.tipo_arquivo === 'CSV' && <label>Delimitador<select value={configuracao.delimitador} onChange={(evento) => setConfiguracao({ ...configuracao, delimitador: evento.target.value })}><option value=";">Ponto e vírgula (;)</option><option value=",">Vírgula (,)</option><option value="\t">Tabulação</option><option value="|">Barra vertical (|)</option></select></label>}
              <label>Primeira linha de dados<input type="number" min="2" value={configuracao.linha_inicial} onChange={(evento) => setConfiguracao({ ...configuracao, linha_inicial: evento.target.value })} /></label>
              <label>Formato do período<select value={configuracao.formato_periodo} onChange={(evento) => setConfiguracao({ ...configuracao, formato_periodo: evento.target.value })}><option value="MM/AAAA">MM/AAAA</option><option value="AAAA-MM">AAAA-MM</option><option value="MES/AAAA">MÊS/AAAA</option></select></label>
              <label>Percentuais<select value={configuracao.percentual_como} onChange={(evento) => setConfiguracao({ ...configuracao, percentual_como: evento.target.value })}><option value="FRACAO">15% será 0,15</option><option value="NUMERO">15% será 15</option></select></label>
            </div>
            <div className="tabela-container tabela-preview"><table><tbody>{preview.map((linha, indiceLinha) => <tr key={indiceLinha}>{linha.map((celula, indiceColuna) => <td key={indiceColuna} className={indiceLinha === 0 ? 'preview-cabecalho' : ''}>{celula === null || celula === '' ? <span className="celula-vazia">vazio</span> : String(celula)}</td>)}</tr>)}</tbody></table></div>
          </section>

          {modoConfiguracao === 'RECONHECENDO' && (
            <section className="painel perfil-reconhecido">
              <FileSearch aria-hidden="true" />
              <div><span className="sobretitulo">Configuração</span><h2>Procurando configuração conhecida…</h2></div>
            </section>
          )}

          {modoConfiguracao === 'PERFIL' && reconhecimentoPerfil && (
            <section className="painel perfil-reconhecido">
              <CheckCircle2 aria-hidden="true" />
              <div>
                <span className="sobretitulo">Caminho rápido</span>
                <h2>{reconhecimentoPerfil.resultado === 'AMBIGUO'
                  ? 'Mais de uma configuração corresponde a este arquivo.'
                  : 'Configuração conhecida encontrada'}</h2>
                {reconhecimentoPerfil.resultado === 'COMPATIVEL' && (
                  <p>Nome: <strong>{reconhecimentoPerfil.perfil_sugerido.nome}</strong> · Versão: <strong>{reconhecimentoPerfil.perfil_sugerido.versao}</strong></p>
                )}
                {reconhecimentoPerfil.resultado === 'AMBIGUO' && (
                  <label>Configuração
                    <select aria-label="Configuração conhecida" value={perfilSelecionadoId} onChange={(evento) => setPerfilSelecionadoId(evento.target.value)}>
                      <option value="">Selecione</option>
                      {reconhecimentoPerfil.candidatos.map((perfil) => <option key={perfil.id} value={perfil.id}>{perfil.nome} · versão {perfil.versao}</option>)}
                    </select>
                  </label>
                )}
              </div>
              <div className="formulario__acoes">
                <button className="botao botao--primario" disabled={!perfilSelecionadoId || processando} onClick={usarConfiguracaoConhecida}>{processando ? 'APLICANDO…' : 'USAR CONFIGURAÇÃO'}</button>
                <button className="botao botao--texto" disabled={processando} onClick={mapearManualmente}>MAPEAR MANUALMENTE</button>
              </div>
            </section>
          )}

          {modoConfiguracao === 'MANUAL' && (
          <section className="painel">
            <div className="painel__cabecalho painel__cabecalho--simples"><div><span className="sobretitulo">Etapa 2</span><h2>Mapeie as colunas</h2><p>As sugestões são iniciais. Confirme cada papel explicitamente.</p></div></div>
            <div className="mapa-colunas">
              {mapeamentos.map((item) => {
                const nomeColuna = cabecalhos[item.indice_coluna - 1] || item.nome;
                return <article className="mapa-colunas__item" key={item.indice_coluna}>
                  <span>Coluna {item.indice_coluna}</span>
                  <strong>{nomeColuna}</strong>
                  <label>Função da coluna<select aria-label={`Mapeamento da coluna ${nomeColuna}`} value={item.selecao} onChange={(evento) => alterarMapeamento(item.indice_coluna, evento.target.value)}><option value="IGNORAR">Ignorar coluna</option><option value="CODIGO_ENTIDADE">Código da entidade</option><option value="NOME_ENTIDADE">Nome da entidade</option><option value="PERIODO">Período</option><option value={SELECAO_INDICADOR_EXISTENTE}>Associar a indicador existente</option><option value={SELECAO_INDICADOR_NOVO}>Criar novo indicador</option></select></label>
                  {item.selecao === SELECAO_INDICADOR_EXISTENTE && <label>Indicador<select aria-label={`Indicador existente da coluna ${nomeColuna}`} value={item.indicador_existente_id} onChange={(evento) => alterarIndicadorExistente(item.indice_coluna, evento.target.value)}><option value="">Selecione</option>{indicadores.map((indicador) => <option key={indicador.id} value={indicador.id}>{indicador.nome} · {indicador.unidade_medida} · {indicador.direcao === 'MAIOR_MELHOR' ? 'Maior é melhor' : 'Menor é melhor'}</option>)}</select></label>}
                  {item.selecao === SELECAO_INDICADOR_NOVO && <div className="novo-indicador">
                    <label>Código<input aria-label={`Código do novo indicador da coluna ${nomeColuna}`} value={item.novo_indicador.codigo} onChange={(evento) => alterarNovoIndicador(item.indice_coluna, 'codigo', evento.target.value)} /></label>
                    <label>Nome<input aria-label={`Nome do novo indicador da coluna ${nomeColuna}`} value={item.novo_indicador.nome} onChange={(evento) => alterarNovoIndicador(item.indice_coluna, 'nome', evento.target.value)} /></label>
                    <label>Unidade de medida<input aria-label={`Unidade do novo indicador da coluna ${nomeColuna}`} value={item.novo_indicador.unidade_medida} onChange={(evento) => alterarNovoIndicador(item.indice_coluna, 'unidade_medida', evento.target.value)} placeholder="Ex.: unidades, %, minutos" /></label>
                    <label>Direção<select aria-label={`Direção do novo indicador da coluna ${nomeColuna}`} value={item.novo_indicador.direcao} onChange={(evento) => alterarNovoIndicador(item.indice_coluna, 'direcao', evento.target.value)}><option value="">Selecione</option><option value="MAIOR_MELHOR">Maior é melhor</option><option value="MENOR_MELHOR">Menor é melhor</option></select></label>
                    <label>Peso percentual<input aria-label={`Peso do novo indicador da coluna ${nomeColuna}`} type="number" min="0" max="100" step="0.01" value={item.novo_indicador.peso_percentual} onChange={(evento) => alterarNovoIndicador(item.indice_coluna, 'peso_percentual', evento.target.value)} /></label>
                    <label className="check-label"><input type="checkbox" checked={item.novo_indicador.participa_global_score} onChange={(evento) => alterarNovoIndicador(item.indice_coluna, 'participa_global_score', evento.target.checked)} />Participa do Global Score</label>
                    <label className="check-label"><input type="checkbox" checked={item.novo_indicador.obrigatorio} onChange={(evento) => alterarNovoIndicador(item.indice_coluna, 'obrigatorio', evento.target.checked)} />Indicador obrigatório</label>
                  </div>}
                  {errosMapeamento[item.indice_coluna]?.length > 0 && <ul className="erros-mapeamento">{errosMapeamento[item.indice_coluna].map((erro) => <li key={erro}>{erro}</li>)}</ul>}
                </article>;
              })}
            </div>
            <section className="resumo-metricas" aria-label="Resumo das métricas">
              <div><span className="sobretitulo">Métricas</span><h3>{resumoMetricas.total} coluna(s) de métricas identificada(s)</h3><p>{resumoMetricas.associados} associada(s) a indicadores existentes · {resumoMetricas.novos} novo(s) indicador(es) · {resumoMetricas.ignorados} ignorada(s)</p></div>
              <ul>{resumoMetricas.detalhes.map((item) => <li key={`${item.indice_coluna}-${item.coluna}`}><strong>{item.coluna}</strong><span>{item.descricao}</span></li>)}</ul>
              <div className={`peso-planejado ${Math.abs(pesoPlanejado - 100) < 0.001 ? 'peso-planejado--ok' : 'peso-planejado--alerta'}`}><span>Peso total planejado para o Global Score</span><strong>{pesoPlanejado.toLocaleString('pt-BR')}%</strong>{Math.abs(pesoPlanejado - 100) >= 0.001 && <small>O total está diferente de 100%. Revise os pesos antes de ativar uma Base de Referência.</small>}</div>
            </section>
            <p className="nota-interface">As escolhas desta etapa apenas planejam a importação. Novos indicadores serão criados somente após a validação e a confirmação do lote.</p>
            <div className="formulario__acoes"><button className="botao botao--primario" onClick={validar} disabled={processando}>{processando ? 'VALIDANDO…' : 'VALIDAR SEM GRAVAR'}</button></div>
          </section>
          )}
        </>
      )}

      {validacao && !resultado && (
        <section className="painel painel-validacao">
          <div className="painel__cabecalho painel__cabecalho--simples"><div><span className="sobretitulo">Etapa 3 · Validação prévia</span><h2>Resultado da validação</h2><p>Erros bloqueiam a confirmação. Alertas e valores atípicos exigem revisão.</p></div><span className={`status status--${validacao.quantidade_erros ? 'erro' : validacao.quantidade_alertas ? 'alerta' : 'ativo'}`}>{validacao.status}</span></div>
          <div className="resumo-validacao"><div><span>Linhas lidas</span><strong>{validacao.linhas_lidas}</strong></div><div><span>Observações previstas</span><strong>{validacao.observacoes_a_criar}</strong></div><div><span>Erros</span><strong>{validacao.quantidade_erros}</strong></div><div><span>Alertas</span><strong>{validacao.quantidade_alertas}</strong></div></div>
          {entidadesDesconhecidas.length > 0 && <section className="entidades-resolver">
            <div className="entidades-resolver__cabecalho"><div><span className="sobretitulo">Decisão por código</span><h3>Entidades a resolver</h3><p>{entidadesDesconhecidas.length} entidade(s) desconhecida(s) · {entidadesDesconhecidas.reduce((total, item) => total + item.quantidade_linhas, 0)} linha(s) afetada(s)</p></div></div>
            {grupos.length === 0
              ? <div className="sem-grupos"><p>Nenhum grupo disponível para estas entidades.</p><button className="botao botao--secundario" onClick={abrirFormularioGrupo}>CRIAR PRIMEIRO GRUPO</button></div>
              : <div className="acao-lote"><label>Grupo para criação em lote<select aria-label="Grupo para criar todas as entidades" value={grupoLote} onChange={(evento) => setGrupoLote(evento.target.value)}><option value="">Selecione</option>{grupos.map((grupo) => <option key={grupo.id} value={grupo.id}>{grupo.nome}</option>)}</select></label><button className="botao botao--secundario" onClick={abrirFormularioGrupo}>+ CRIAR NOVO GRUPO</button><button className="botao botao--secundario" disabled={!grupoLote} onClick={() => { setDecisoesEntidades((atuais) => aplicarCriacaoEmLote(entidadesDesconhecidas, atuais, grupoLote)); setErrosEntidades({}); }}>CRIAR TODAS AS ENTIDADES DESCONHECIDAS</button></div>}
            {formularioGrupoAberto && <form className="formulario novo-grupo-contextual" onSubmit={criarGrupo}><h4>Novo grupo comparável</h4><label>Nome *<input aria-label="Nome do novo grupo" value={novoGrupo.nome} onChange={(evento) => { setNovoGrupo({ ...novoGrupo, nome: evento.target.value }); setErroGrupo(''); setGrupoDuplicado(null); }} /></label><label>Descrição<textarea aria-label="Descrição do novo grupo" value={novoGrupo.descricao} onChange={(evento) => setNovoGrupo({ ...novoGrupo, descricao: evento.target.value })} /></label>{erroGrupo && <p className="entidade-decisao__erro" role="alert">{erroGrupo}</p>}<div className="formulario__acoes">{grupoDuplicado?.ativo && <button type="button" className="botao botao--secundario" onClick={usarGrupoExistente}>USAR GRUPO EXISTENTE</button>}<button className="botao botao--primario" disabled={processando}>{processando ? 'CRIANDO…' : 'CRIAR GRUPO'}</button><button type="button" className="botao botao--texto" onClick={() => setFormularioGrupoAberto(false)}>CANCELAR</button></div></form>}
            <div className="entidades-resolver__lista">{entidadesDesconhecidas.map((item) => {
              const decisao = decisoesEntidades[item.codigo] || {};
              return <article key={item.codigo} className={`entidade-decisao ${errosEntidades[item.codigo] ? 'entidade-decisao--erro' : ''}`}><div><strong>{item.codigo}</strong><span>{item.quantidade_linhas} linha(s) afetada(s)</span></div><label>Decisão<select aria-label={`Decisão para a entidade ${item.codigo}`} value={decisao.acao || ''} onChange={(evento) => alterarDecisaoEntidade(item.codigo, { acao: evento.target.value, grupo_id: undefined, entidade_id: undefined })}><option value="">Selecione</option><option value="CRIAR">Criar nova entidade</option><option value="ASSOCIAR">Associar a entidade existente</option><option value="IGNORAR">Ignorar esta entidade</option></select></label>
                {decisao.acao === 'CRIAR' && <div className="entidade-decisao__campos"><label>Código<input value={item.codigo} disabled /></label><label>Nome (opcional)<input aria-label={`Nome da nova entidade ${item.codigo}`} value={decisao.nome || ''} onChange={(evento) => alterarDecisaoEntidade(item.codigo, { nome: evento.target.value })} /></label><label>Grupo<select aria-label={`Grupo da nova entidade ${item.codigo}`} value={decisao.grupo_id || ''} onChange={(evento) => alterarDecisaoEntidade(item.codigo, { grupo_id: evento.target.value })}><option value="">Selecione</option>{grupos.map((grupo) => <option key={grupo.id} value={grupo.id}>{grupo.nome}</option>)}</select></label></div>}
                {decisao.acao === 'ASSOCIAR' && <label>Entidade existente<select aria-label={`Entidade existente para ${item.codigo}`} value={decisao.entidade_id || ''} onChange={(evento) => alterarDecisaoEntidade(item.codigo, { entidade_id: evento.target.value })}><option value="">Selecione</option>{entidades.map((entidade) => { const grupo = grupos.find((itemGrupo) => itemGrupo.id === entidade.grupo_id); return <option key={entidade.id} value={entidade.id}>{entidade.codigo} · {entidade.nome} · {grupo?.nome || 'Grupo não informado'}</option>; })}</select></label>}
                {decisao.acao === 'IGNORAR' && <p>As {item.quantidade_linhas} linha(s) desta entidade não serão importadas.</p>}
                {errosEntidades[item.codigo] && <p className="entidade-decisao__erro" role="alert">{errosEntidades[item.codigo]}</p>}
              </article>;
            })}</div>
            <div className="formulario__acoes"><button className="botao botao--primario" onClick={revalidarEntidades} disabled={processando}>{processando ? 'REVALIDANDO…' : 'REVALIDAR DADOS'}</button></div>
          </section>}
          {(validacao.erros?.length > 0 || validacao.alertas?.length > 0) && <details className="detalhes-validacao"><summary>Detalhes da validação</summary><ListaOcorrencias titulo="Erros bloqueantes" itens={validacao.erros} tipo="erro" /><ListaOcorrencias titulo="Alertas de qualidade e valores atípicos" itens={validacao.alertas} tipo="alerta" /></details>}
          {!validacao.quantidade_erros && <section className="resumo-entidades"><h3>Resumo das entidades</h3><p>Reconhecidas: <strong>{validacao.entidades_reconhecidas ?? 0}</strong> · Novas: <strong>{validacao.novas_entidades?.length ?? 0}</strong> · Associadas manualmente: <strong>{Object.values(decisoesEntidades).filter((item) => item.acao === 'ASSOCIAR').length}</strong> · Ignoradas: <strong>{Object.values(decisoesEntidades).filter((item) => item.acao === 'IGNORAR').length}</strong></p></section>}
          {!validacao.quantidade_erros && <div className="confirmacao-alertas"><CheckCircle2 aria-hidden="true" /><div><strong>{validacao.quantidade_alertas ? 'Existem alertas. Deseja confirmar mesmo assim?' : 'O lote está pronto para confirmação.'}</strong><p>A confirmação registra todas as observações do lote.</p></div><button className="botao botao--primario" onClick={confirmar} disabled={processando}>{processando ? 'CONFIRMANDO…' : validacao.quantidade_alertas ? 'ACEITAR ALERTAS E CONFIRMAR' : 'CONFIRMAR IMPORTAÇÃO'}</button></div>}
        </section>
      )}

      {resultado && (
        <section className="painel resultado-importacao">
          <CheckCircle2 aria-hidden="true" />
          <span className="sobretitulo">Etapa 4</span>
          <h2>Importação concluída</h2>
          <strong>{resultado.observacoes_criadas} observação(ões) criada(s)</strong>
          <p>Lote #{resultado.id} · {resultado.nome_arquivo_original} · status {resultado.status}</p>
          {!perfilSalvo && !formularioPerfilAberto && <button className="botao botao--primario" onClick={() => setFormularioPerfilAberto(true)}>SALVAR CONFIGURAÇÃO</button>}
          {formularioPerfilAberto && (
            <form className="formulario salvar-perfil" onSubmit={salvarConfiguracao}>
              <label>Nome da configuração *
                <input aria-label="Nome da configuração" value={nomePerfil} onChange={(evento) => { setNomePerfil(evento.target.value); setErroNomePerfil(''); }} placeholder="Ex.: Importação mensal" />
              </label>
              {erroNomePerfil && <p className="entidade-decisao__erro" role="alert">{erroNomePerfil}</p>}
              <div className="formulario__acoes">
                <button className="botao botao--primario" disabled={processando}>{processando ? 'SALVANDO…' : 'SALVAR'}</button>
                <button type="button" className="botao botao--texto" disabled={processando} onClick={() => { setFormularioPerfilAberto(false); setErroNomePerfil(''); }}>CANCELAR</button>
              </div>
            </form>
          )}
          {perfilSalvo && <p className="perfil-salvo"><CheckCircle2 aria-hidden="true" />Configuração salva para próximas importações.</p>}
          <button className="botao botao--secundario" onClick={reiniciar}>Importar outro arquivo</button>
        </section>
      )}
    </div>
  );
}
