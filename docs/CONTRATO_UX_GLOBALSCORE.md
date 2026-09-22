# Contrato de Produto e UX do GlobalScore

**Status:** aprovado para orientar as Etapas 4B1 a 4C  
**Componente:** frontend GlobalScore  
**Natureza:** contrato obrigatório de produto e experiência do usuário  
**Escopo desta versão:** documentação; nenhuma funcionalidade foi implementada

## 1. Finalidade deste contrato

Este documento registra o fluxo de produto que deve orientar as próximas etapas do GlobalScore. Ele separa o modelo técnico interno da experiência oferecida ao gestor e evita que novas telas sejam construídas como uma sequência de cadastros isolados.

As entidades técnicas `Projeto`, `GrupoComparavel`, `Entidade`, `Indicador`, `BaseReferencia`, `Observacao`, `Importacao` e `Avaliacao` continuam válidas. O motor matemático, suas réguas percentílicas, pesos, critérios de elegibilidade e Bases de Referência congeladas também permanecem válidos e não devem ser reescritos no frontend.

## 2. Princípio central

O GlobalScore não deve se apresentar ao gestor como um CRUD de projetos, grupos, entidades, indicadores, bases e avaliações. Esses conceitos existem internamente para garantir organização, rastreabilidade e reprodução dos resultados, mas devem aparecer no momento em que ajudam o usuário a concluir uma tarefa.

O fluxo principal do gestor é:

```text
LOGIN
  ↓
IMPORTAR DADOS
  ↓
CONFIRMAR ESTRUTURA E MÉTRICAS
  ↓
DEFINIR REFERÊNCIA
  ↓
PROCESSAR
  ↓
ANALISAR E COMPARAR
  ↓
IMPORTAR NOVOS PERÍODOS
  ↓
ACOMPANHAR EVOLUÇÃO E EVENTOS
```

Após a primeira importação, o gestor deve chegar aos resultados com poucos cliques. Cadastros auxiliares devem ser feitos dentro do contexto da tarefa sempre que forem necessários.

## 3. Contrato da importação

A importação é o principal momento de configuração do GlobalScore. Ela deve conduzir o usuário desde o arquivo bruto até uma estrutura confirmada e pronta para processamento.

Durante o mesmo fluxo, deve ser possível:

- identificar a coluna da entidade;
- identificar a coluna do período ou informar um período comum ao lote;
- identificar colunas de métricas;
- associar uma métrica a um indicador existente;
- criar um indicador sem sair da importação;
- ignorar uma coluna;
- associar um código do arquivo a uma entidade existente;
- criar entidades em lote;
- ignorar uma entidade do arquivo;
- selecionar um grupo comparável existente;
- criar um grupo comparável quando necessário;
- validar toda a configuração antes da gravação;
- revisar erros bloqueantes e alertas não bloqueantes;
- confirmar conscientemente a gravação.

O sistema pode sugerir interpretações, mas o gestor confirma o significado das colunas e as decisões de criação ou associação. Valores ausentes continuam diferentes de zero.

O usuário não deve ser obrigado a abandonar a importação para cadastrar indicadores, entidades ou grupos. Se navegar para outra área, uma importação em andamento deve permanecer recuperável. A retomada deve restaurar arquivo analisado, configuração de leitura, mapeamentos, decisões e resultado da última validação disponível.

### 3.1 Resultado mínimo da confirmação

Antes de gravar, a interface deve mostrar um resumo que permita ao gestor responder:

- qual projeto e grupo receberão os dados;
- quantas entidades foram reconhecidas, associadas, criadas ou ignoradas;
- quais indicadores foram associados, criados ou ignorados;
- quais períodos serão incluídos;
- quantas observações serão criadas;
- quais erros impedem a confirmação;
- quais alertas exigem ciência do gestor.

Erros repetidos causados pela mesma entidade desconhecida devem ser agrupados por decisão necessária. A interface pode informar quantas linhas são afetadas, sem obrigar o gestor a resolver a mesma entidade linha por linha.

## 4. Contrato da importação incremental

Depois da primeira importação confirmada, o GlobalScore deve lembrar a estrutura validada para aquele projeto e tipo de arquivo.

Uma nova planilha compatível deve:

- reconhecer colunas já confirmadas;
- reconhecer entidades pelos códigos estáveis;
- reconhecer indicadores e unidades já associados;
- identificar períodos novos;
- destacar somente diferenças reais;
- apresentar um resumo dos dados novos;
- permitir a inclusão dos novos períodos com poucos cliques.

O sistema deve solicitar intervenção quando houver, por exemplo, nova coluna, entidade desconhecida, indicador ausente, mudança estrutural, conflito com observação existente ou configuração numérica incompatível.

A importação incremental não recalibra automaticamente uma Base de Referência. Bases ativadas permanecem congeladas. A entrada de novos períodos alimenta o histórico e as avaliações futuras; uma nova referência somente nasce por ação explícita do gestor.

## 5. Contrato de processamento

O usuário não deve calcular manualmente uma entidade e um período por vez.

Após selecionar a referência e o período ou intervalo de análise, o sistema deve processar em lote todas as combinações elegíveis de entidade e período:

1. identificar as entidades compatíveis com o grupo e o modo da base;
2. identificar os períodos solicitados;
3. aplicar a Base de Referência ativa e compatível;
4. solicitar o cálculo ao backend;
5. apresentar quantidade processada, incompleta, ignorada ou com erro;
6. direcionar o gestor para a análise dos resultados.

Toda a matemática permanece exclusivamente no backend. O frontend não pode duplicar ou reinterpretar:

- `PERCENTILE.INC`;
- régua P0–P100;
- direção `MAIOR_MELHOR` ou `MENOR_MELHOR`;
- pesos;
- elegibilidade;
- cobertura histórica;
- tratamento de `SEM_VARIABILIDADE`;
- cálculo do Global Score;
- regras de imutabilidade da Base de Referência.

## 6. Contrato da Base de Referência

O fluxo normal de Base de Referência deve estar disponível no frontend e não pode depender do Swagger.

O gestor deve conseguir:

1. selecionar o projeto e o grupo comparável;
2. escolher o período histórico inicial e final;
3. escolher `ENTRE_ENTIDADES` ou `HISTORICO_ENTIDADE`;
4. indicar a entidade de referência quando o modo exigir;
5. configurar a cobertura mínima;
6. revisar os indicadores participantes;
7. visualizar cobertura, exclusões e indicadores sem dados ou sem variabilidade;
8. revisar e ajustar pesos até totalizarem 100%;
9. processar a base;
10. revisar o resultado do processamento;
11. ativar conscientemente a versão.

A interface deve explicar a consequência da ativação: a versão fica congelada e avaliações futuras continuam vinculadas a ela. Recalibrar significa criar uma nova versão, preservando as anteriores.

Uma opção de avaliação somente pode apresentar bases:

- ativas;
- pertencentes ao projeto selecionado;
- compatíveis com o grupo da entidade;
- compatíveis com o modo da base;
- autorizadas a avaliar a entidade escolhida.

No modo `HISTORICO_ENTIDADE`, somente a própria entidade de referência pode ser avaliada. No modo `ENTRE_ENTIDADES`, somente entidades do grupo da base podem ser comparadas e classificadas.

## 7. Contrato do dashboard

A Visão Geral deve ser analítica e comparativa. Seu primeiro objetivo é permitir que o gestor entenda desempenho, posição e evolução, e não exibir a estrutura técnica dos registros.

### 7.1 Modo grupo

A visão de grupo deve apresentar:

- período analisado;
- grupo selecionado;
- Base de Referência utilizada;
- Global Scores das entidades;
- ranking quando aplicável;
- evolução no tempo;
- distribuição ou comparação dos resultados;
- destaques positivos e pontos de atenção.

### 7.2 Modo entidade

A visão individual deve identificar explicitamente:

```text
NOME DA ENTIDADE
GRUPO
PERÍODO
BASE DE REFERÊNCIA
```

Ela deve apresentar:

- Global Score;
- posição no grupo quando aplicável;
- evolução temporal;
- radar comparativo;
- indicadores individuais;
- eventos relacionados.

### 7.3 Regras para os gráficos

O gráfico de evolução deve ser grande e protagonista. Ele deve permitir relacionar períodos, valores e eventos.

O radar deve ser grande e comparativo, usando uma referência compreensível, como:

- entidade selecionada contra referência do grupo; ou
- período atual contra período anterior.

Quando existir uma comparação válida, o radar não deve mostrar apenas um polígono decorativo.

As barras de indicadores devem apresentar contexto suficiente para interpretação:

- nome do indicador;
- percentil;
- peso aplicado;
- valor observado, quando disponível;
- referência visual de comparação.

A interface deve reduzir cards sem informação e espaços vazios excessivos. A prioridade é densidade analítica com leitura clara.

## 8. Contrato de eventos e storytelling

O gestor deve poder registrar fatos que ajudem a contextualizar a evolução. Cada evento deve possuir, no mínimo:

- título;
- descrição;
- data ou período;
- escopo: entidade, grupo ou projeto.

Os eventos devem aparecer na linha de evolução. A leitura narrativa deve seguir:

```text
TEMPO → EVENTO → MUDANÇA → RESULTADO
```

A interface pode comparar resultados antes e depois do evento, mas não pode afirmar causalidade automaticamente. Ela mostra que uma mudança ocorreu após um fato registrado; não conclui que o fato causou a mudança.

## 9. Contrato de exportação

O gestor deve poder exportar resultados processados nos formatos:

- CSV;
- XLSX;
- JSON.

Os escopos disponíveis devem ser:

- entidade atual;
- grupo;
- projeto.

A exportação deve aceitar um período ou intervalo selecionado. Conforme o escopo e a disponibilidade, deve incluir:

- valores observados;
- pontuações percentílicas;
- pesos aplicados;
- contribuições para o Global Score;
- Global Score;
- ranking quando aplicável;
- eventos quando aplicável.

A exportação deve usar resultados persistidos e reproduzíveis, vinculados à Base de Referência utilizada.

## 10. Contrato de navegação

A navegação principal deve reduzir o protagonismo dos cadastros técnicos. A direção aprovada é:

- **Visão Geral**;
- **Importar / Atualizar Dados**;
- **Configuração**.

Entidades, indicadores, grupos e bases continuam acessíveis, mas podem ser reunidos em Configuração ou apresentados dentro dos fluxos que exigem essas decisões. A arquitetura da informação deve privilegiar a tarefa do gestor.

## 11. Problemas identificados no teste manual

Os problemas abaixo foram observados na Etapa 4A e devem ser considerados critérios de aceite das próximas etapas:

1. A importação perde o estado visível quando o usuário sai da página.
2. Indicadores precisam ser criados em outra tela antes do mapeamento visual.
3. Entidades precisam ser criadas manualmente fora da importação visual.
4. Não há criação de entidades em lote na interface.
5. Entidades desconhecidas produzem erros repetidos por linha, em vez de uma decisão agrupada.
6. A criação de grupos depende do Swagger.
7. Grupos com o mesmo nome podem ser criados no mesmo projeto.
8. A tentativa de criar uma base duplicada produziu HTTP 500 com traceback.
9. Uma base incompatível foi apresentada como opção de avaliação.
10. A avaliação é processada uma entidade e um período por vez.
11. O dashboard não deixa a entidade analisada suficientemente explícita.
12. Os gráficos ocupam pouco espaço para uma leitura analítica.
13. O radar atual é pouco informativo por não apresentar comparação real.
14. As barras atuais apresentam pouco contexto.
15. O histórico de avaliações não está acessível pela interface.
16. Não existe ranking real disponível no dashboard.
17. Eventos ainda não são persistidos.
18. Não existe exportação de resultados em CSV, XLSX ou JSON.
19. Não existe fluxo de importação incremental.

Esses registros descrevem o estado atual. Sua solução deve respeitar as regras de negócio aprovadas e ser dividida nas etapas deste contrato.

## 12. Requisitos acadêmicos obrigatórios

Nenhuma evolução de UX pode quebrar os requisitos da pós-graduação:

- frontend e backend continuam componentes separados;
- frontend e API permanecem em repositórios públicos separados;
- React continua permitido como tecnologia do frontend;
- o frontend deve demonstrar chamadas reais `GET`, `POST`, `PATCH` e `DELETE`;
- a API própria permanece em Flask com documentação Swagger;
- Supabase Auth permanece como a API externa do MVP;
- cada componente deve possuir seu Dockerfile;
- cada repositório deve possuir README com instalação e execução;
- o componente principal deve apresentar o fluxograma de arquitetura;
- toda matemática permanece no backend;
- a solução completa deve permitir demonstração objetiva em vídeo de até seis minutos.

O CRUD de Indicadores pode continuar demonstrando os quatro métodos HTTP exigidos, mesmo que sua tela deixe de ocupar o primeiro nível da navegação.

## 13. Plano de execução aprovado

Este plano registra sequência e limites. Nenhum item abaixo foi implementado nesta etapa documental.

### 4B1 — Fluxo de importação

- manter e restaurar uma importação em andamento;
- permitir criar ou associar indicadores dentro do mapeamento;
- permitir criar, associar ou ignorar entidades em lote;
- permitir selecionar ou criar grupo no contexto da importação;
- agrupar decisões repetidas de entidades desconhecidas;
- expor revisão e governança do lote já suportadas pelo backend;
- corrigir validações de unicidade e erros técnicos identificados que afetem o fluxo.

### 4B2 — Importação incremental

- persistir e recuperar modelos de mapeamento confirmados;
- reconhecer arquivos estruturalmente compatíveis;
- destacar novos períodos, entidades, indicadores e conflitos;
- permitir confirmação rápida quando não houver diferenças relevantes;
- manter Bases de Referência congeladas.

### 4B3 — Referência e processamento em lote

- construir o fluxo completo de criação, processamento, revisão e ativação de bases;
- filtrar bases por projeto, grupo, modo, entidade e estado;
- fornecer processamento em lote de avaliações elegíveis;
- mostrar resumo de resultados e falhas por lote;
- reutilizar integralmente o motor matemático existente.

### 4B4 — API analítica e novo dashboard

- oferecer consultas de histórico, ranking e comparações;
- retornar contexto suficiente de projeto, grupo, entidade, período e base;
- redesenhar a Visão Geral nos modos grupo e entidade;
- ampliar evolução e radar comparativo;
- contextualizar barras e reduzir espaços sem informação;
- manter no frontend apenas apresentação e interação.

### 4B5 — Eventos, storytelling e exportação

- persistir eventos nos escopos aprovados;
- apresentar eventos na evolução;
- oferecer comparação descritiva antes e depois;
- exportar resultados em CSV, XLSX e JSON por escopo e período;
- preservar a rastreabilidade da Base de Referência utilizada.

### 4C — Docker, documentação, QA e vídeo

- criar e validar o Dockerfile do frontend;
- revisar Docker e execução integrada dos componentes;
- atualizar os READMEs e o fluxograma de arquitetura;
- validar requisitos acadêmicos ponta a ponta;
- executar QA funcional e regressão do motor;
- preparar roteiro e demonstração de até seis minutos.

## 14. Auditoria do estado atual

### 14.1 Capacidades existentes no backend ainda não expostas integralmente

| Capacidade existente | Situação no backend | Exposição atual no frontend | Implicação |
|---|---|---|---|
| Criar, associar ou ignorar entidade durante a importação | O serviço aceita decisões `CRIAR`, `ASSOCIAR` e `IGNORAR` e cria entidades atomicamente na confirmação | Não exposta; a interface apenas informa que entidades desconhecidas serão apontadas | 4B1 deve apresentar decisões agrupadas sem reimplementar a regra |
| Criar, associar ou ignorar indicador durante a importação | O serviço aceita `CRIAR`, `ASSOCIAR`/`EXISTENTE` e `IGNORAR`, validando código, nome, unidade, direção e peso | Parcial; somente associação a indicador existente ou ignorar | 4B1 deve completar o payload visual já aceito pelo backend |
| Formato largo e longo | Validação aceita `LARGO` e `LONGO` | A interface envia apenas `LARGO` | Avaliar exposição somente se necessária ao MVP, sem romper o formato atual |
| Período padrão do lote | Backend aceita `periodo_padrao` quando não há coluna de período | Não exposto | Pode reduzir exigências para arquivos de um único mês em 4B1 |
| Governança e consulta do lote | Existem consulta por ID, observações do lote e anulação/cancelamento protegido | Frontend usa upload, validação e confirmação; não expõe consulta, rastreabilidade ou anulação | Completar o fluxo em 4B1 |
| Configuração e mapeamento persistidos no lote | Backend guarda JSON de leitura e mapeamento após validação | O estado fica apenas no componente e não é restaurado | Recuperação de lote em 4B1; modelos reutilizáveis exigem contrato adicional em 4B2 |
| CRUD administrativo de grupos | `GET`, `POST`, `GET por ID` e `PATCH` existem | Somente `GET` é usado para cadastrar entidades | Criar/selecionar grupo no contexto em 4B1 ou Configuração |
| Registro manual e consulta de observações | `GET` filtrável e `POST` existem | Não exposto | Pode apoiar correções ou entrada manual futura, sem ser o fluxo principal |
| Ciclo completo da Base de Referência | Criar, consultar, processar, ajustar pesos e ativar já existem | Apenas a listagem é usada na avaliação | Expor o ciclo em 4B3 |
| Indicadores da base e cobertura resumida | A consulta individual da base retorna status dos indicadores, população, participação e peso | Não exposto | Usar na revisão anterior à ativação em 4B3 |
| Avaliação individual reproduzível | `POST /avaliacoes` calcula e `GET /avaliacoes/{id}` devolve itens, valores, percentis, pesos e contribuições | Exposto de forma individual | Preservar como unidade do motor; criar orquestração em lote no backend em 4B3 |
| CRUD de indicadores com desativação lógica | `GET`, `POST`, `PATCH` e `DELETE` existem | Exposto | Preserva a demonstração acadêmica dos quatro métodos HTTP |
| Autenticação externa | Supabase Auth valida o usuário e protege as rotas de importação | Login, sessão e Bearer token estão expostos | Preservar; ampliação de proteção deve ser planejada sem mudar o provedor |

### 14.2 Matriz de requisitos

Legenda de risco: **baixo** quando o contrato atual já atende; **médio** quando exige integração ou ajuste localizado; **alto** quando exige novo contrato de dados, persistência ou cuidado especial com compatibilidade e reprodução.

| Requisito | Já existe | Precisa frontend | Precisa backend | Risco | Etapa |
|---|---|---|---|---|---|
| Login por e-mail e senha | Sim, com Supabase Auth | Manter | Manter validação | Baixo | 4C |
| Fluxo orientado por importação | Parcial | Reorganizar jornada | Reutilizar rotas existentes | Médio | 4B1 |
| Estado recuperável da importação | Parcial: lote e mapeamento validado são persistidos | Restaurar por lote e preservar navegação | Pode exigir listagem/retomada segura do lote e acesso ao arquivo temporário | Alto | 4B1 |
| Identificar entidade e período | Sim | Já exposto; aprimorar clareza | Já existe | Baixo | 4B1 |
| Associar indicador existente | Sim | Já exposto | Já existe | Baixo | 4B1 |
| Criar indicador na importação | Backend já aceita | Implementar formulário contextual | Ajustes apenas se a validação auditada revelar lacuna | Médio | 4B1 |
| Criar, associar ou ignorar entidades em lote | Backend já aceita | Implementar decisões agrupadas | Ajustes apenas para resumo/agregação se necessários | Médio | 4B1 |
| Criar ou selecionar grupo no fluxo | CRUD existe no backend | Implementar seleção/criação contextual | Impedir duplicidade de nome conforme regra a aprovar tecnicamente | Médio | 4B1 |
| Validação prévia e alertas | Sim | Já exposto; melhorar revisão | Já existe | Baixo | 4B1 |
| Consulta, cancelamento e anulação de lote | Sim no backend | Expor governança | Já existe | Médio | 4B1 |
| Importação incremental | Não | Fluxo de reconhecimento e confirmação | Persistir modelo de estrutura e comparar versões | Alto | 4B2 |
| Preservar bases congeladas ao importar | Sim | Comunicar no fluxo | Já existe | Baixo | 4B2 |
| Criar e configurar Base de Referência | Backend existente | Implementar fluxo completo | Corrigir filtros, unicidade e respostas de erro | Alto | 4B3 |
| Revisar cobertura e indicadores da base | Parcial no backend | Criar revisão visual | Pode exigir detalhamento das exclusões por entidade e indicador | Médio | 4B3 |
| Processar e ativar base | Sim no backend | Expor ações e consequências | Tratar conflitos sem HTTP 500 | Alto | 4B3 |
| Filtrar bases compatíveis | Não de forma suficiente | Aplicar seleção contextual | Acrescentar projeto, grupo e filtros/validação na resposta | Alto | 4B3 |
| Processar avaliações em lote | Não | Acionar lote e mostrar progresso/resumo | Criar operação idempotente de lote usando o motor atual | Alto | 4B3 |
| Avaliação individual | Sim | Já exposta | Já existe | Baixo | 4B3 |
| Histórico de avaliações | Não | Consumir e apresentar | Criar consulta filtrável | Alto | 4B4 |
| Ranking real | Não | Consumir e apresentar | Criar consulta por base e período | Alto | 4B4 |
| Dashboard de grupo | Não | Criar visão analítica | Fornecer agregados e contexto | Alto | 4B4 |
| Dashboard de entidade explícito | Parcial | Identificar entidade, grupo, período e base | Completar contexto das respostas | Médio | 4B4 |
| Evolução temporal ampla | Componente visual parcial | Ampliar gráfico e controles | Fornecer série histórica | Alto | 4B4 |
| Radar comparativo | Parcial, com um conjunto | Apresentar duas séries | Fornecer comparação ou períodos com itens | Médio | 4B4 |
| Barras contextualizadas | Parcial | Exibir valor, percentil, peso e referência | Resposta individual já fornece valor, percentil, peso e contribuição; referência visual pode exigir dados adicionais | Médio | 4B4 |
| Rating | Não há regra aprovada implementada | Apresentar quando disponível | Definir e implementar regra antes | Alto | Etapa futura a confirmar |
| Eventos persistidos | Não | Criar gestão e linha do tempo | Criar modelo e rotas por escopo | Alto | 4B5 |
| Comparação antes/depois | Não | Apresentar leitura descritiva | Fornecer séries e eventos | Médio | 4B5 |
| Exportação CSV | Não | Selecionar escopo/período e baixar | Gerar arquivo a partir de resultados persistidos | Médio | 4B5 |
| Exportação XLSX | Não | Selecionar e baixar | Gerar arquivo | Médio | 4B5 |
| Exportação JSON | Não | Selecionar e baixar | Gerar resposta/arquivo | Médio | 4B5 |
| Navegação simplificada | Não | Reorganizar menu e configuração | Não | Médio | 4B1–4B4 |
| GET, POST, PATCH e DELETE reais no frontend | Sim, pelo CRUD de Indicadores e outros fluxos | Preservar demonstração | Manter contratos | Baixo | 4C |
| Frontend e API separados | Sim | Preservar | Preservar | Baixo | 4C |
| API Flask com Swagger | Sim | Não | Preservar e atualizar contratos | Baixo | 4C |
| Supabase como API externa | Sim | Preservar cliente | Preservar validação | Baixo | 4C |
| Dockerfile da API | Sim | Não | Validar | Baixo | 4C |
| Dockerfile do frontend | Não | Criar e documentar | Não | Médio | 4C |
| README dos dois componentes | Sim | Atualizar ao final | Atualizar ao final | Baixo | 4C |
| Fluxograma de arquitetura | Sim no frontend | Atualizar se necessário | Não | Baixo | 4C |
| Matemática somente no backend | Sim | Não duplicar | Preservar motor | Alto se violado | Todas |
| Vídeo de até seis minutos | Não se aplica ao código | Preparar roteiro demonstrável | Garantir ambiente estável | Médio | 4C |

## 15. Limites para as próximas implementações

As próximas etapas devem evoluir contratos e fluxos de maneira incremental. Não está autorizada uma reescrita geral do sistema.

Em especial:

- o motor matemático existente deve ser reutilizado;
- nenhuma régua percentílica deve ser calculada no navegador;
- as Bases de Referência ativadas continuam imutáveis;
- avaliações antigas continuam vinculadas à base utilizada;
- o frontend deve consumir dados reais e apresentar estados honestos quando um contrato ainda não existir;
- correções de erros devem incluir resposta de negócio clara, sem traceback exposto ao usuário;
- cada etapa deve preservar os requisitos acadêmicos e permanecer demonstrável.

Este contrato deve ser consultado antes do planejamento e da implementação das Etapas 4B1, 4B2, 4B3, 4B4, 4B5 e 4C.
