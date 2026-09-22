# GlobalScore — frontend

**MEASURE | COMPARE | ADVANCE**

Interface web do GlobalScore, uma plataforma genérica de avaliação comparativa de desempenho. Este repositório contém somente a camada de interação e apresentação. Percentis, pesos, elegibilidade, réguas e Global Score permanecem calculados pela [API GlobalScore](https://github.com/jorgeluispapiro-gif/globalscore-api).

![Arquitetura do GlobalScore](docs/arquitetura.svg)

## O que existe na Etapa 4A

- autenticação por e-mail e senha com Supabase Auth;
- restauração de sessão, logout, rotas protegidas e tratamento de expiração;
- cliente HTTP único com envio automático do Bearer token;
- shell responsivo com sidebar, cabeçalho e seleção de projeto;
- dashboard editorial com cards, linha de evolução, radar, barras, ranking e controles de Story View;
- CRUD visual de projetos, entidades e indicadores conforme as rotas existentes;
- cálculo e consulta individual de avaliações;
- importação assistida de CSV/XLSX com preview, mapeamento, dry-run, alertas e confirmação;
- estados de carregamento, vazio, erro, sucesso e alerta;
- design system próprio com IBM Plex Sans e IBM Plex Sans Condensed.

Os componentes analíticos nunca recalculam o motor no navegador. Eles apenas apresentam valores recebidos da API.

## Tecnologias

- React 19 e React Router;
- Vite 8;
- JavaScript;
- Recharts;
- Supabase JavaScript;
- CSS próprio e Fontsource;
- Vitest, Testing Library e Oxlint.

## Execução local

Requisito: Node.js 20.19 ou superior. O desenvolvimento desta etapa foi validado com Node.js 24 LTS.

```bash
npm install
cp .env.example .env
npm run dev
```

Preencha o `.env` local:

```dotenv
VITE_SUPABASE_URL=https://kzqtxukjcuhzekbhketf.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_publishable_key
VITE_GLOBALSCORE_API_URL=/api
VITE_GLOBALSCORE_PROXY_TARGET=http://127.0.0.1:5000
```

Abra `http://localhost:5173`. O proxy do Vite encaminha `/api` para o Flask durante o desenvolvimento, evitando dependência de CORS local. Nenhuma senha, token, Secret Key ou `.env` real deve ser versionado.

O backend deve estar ativo em `http://127.0.0.1:5000` e configurado com as variáveis públicas do mesmo projeto Supabase. Consulte o README da API para a inicialização completa.

## Comandos de qualidade

```bash
npm test
npm run lint
npm run build
```

## Rotas da interface

| Rota | Objetivo |
|---|---|
| `/login` | Autenticar pelo Supabase |
| `/dashboard` | Ler os resultados disponíveis |
| `/projetos` | Criar e editar projetos |
| `/importacoes` | Conduzir a importação assistida |
| `/entidades` | Criar, editar e desativar entidades |
| `/indicadores` | Criar, editar e desativar indicadores |
| `/avaliacoes` | Calcular e consultar uma avaliação |

## Endpoints efetivamente consumidos

| Método | Endpoint | Uso na interface |
|---|---|---|
| GET | `/projetos` | seleção e listagem de projetos |
| POST | `/projetos` | novo projeto |
| PATCH | `/projetos/{id}` | edição de projeto |
| GET | `/grupos?projeto_id=` | vínculo de entidades |
| GET | `/entidades?projeto_id=` | listagem e seleção |
| POST | `/entidades` | nova entidade |
| PATCH | `/entidades/{id}` | edição e desativação lógica |
| GET | `/indicadores?projeto_id=` | listagem e mapeamento da importação |
| POST | `/indicadores` | novo indicador |
| PATCH | `/indicadores/{id}` | edição de indicador |
| DELETE | `/indicadores/{id}` | **desativação lógica** do indicador |
| GET | `/bases` | seleção e contexto da avaliação |
| POST | `/avaliacoes` | cálculo pelo backend |
| GET | `/avaliacoes/{id}` | resultado detalhado e dashboard |
| POST | `/importacoes` | upload multipart e preview |
| POST | `/importacoes/{id}/validar` | dry-run de qualidade |
| POST | `/importacoes/{id}/confirmar` | gravação transacional do lote |

## Disponibilidade de dados para o dashboard

| Visual | Dado necessário | Endpoint existente? | Endpoint mínimo sugerido |
|---|---|---:|---|
| Global Score atual | avaliação individual | Sim, `GET /avaliacoes/{id}` | — |
| Percentil por indicador | itens da avaliação | Sim, `GET /avaliacoes/{id}` | — |
| Peso por indicador | itens da avaliação | Sim, `GET /avaliacoes/{id}` | — |
| Radar do período atual | três ou mais itens percentílicos | Sim, `GET /avaliacoes/{id}` | — |
| Barras dos indicadores | percentil e peso dos itens | Sim, `GET /avaliacoes/{id}` | — |
| Rating | faixa e rating calculado | Não | incluir `rating` na resposta da avaliação após a regra ser definida |
| Evolução do Global Score | série de avaliações da entidade | Não | `GET /avaliacoes?entidade_id=&base_id=&periodo_inicial=&periodo_final=` |
| Radar comparativo | itens de dois períodos | Parcial | a mesma listagem histórica com itens, ou endpoint de comparação |
| Ranking | avaliações comparáveis da mesma base e período | Não | `GET /avaliacoes/ranking?base_id=&periodo=` |
| Marcos na linha do tempo | data, título, tipo e descrição | Não | `GET /projetos/{id}/marcos` após implementar o modelo aprovado |

O frontend exibe estados vazios nessas lacunas e não cria dados fictícios. O modo `HISTORICO_ENTIDADE` informa que ranking não se aplica.

## Organização

```text
src/
├── assets/brand/       # logo oficial
├── components/
│   ├── charts/         # Recharts sem regra de negócio
│   ├── dashboard/      # cards, ranking e Story View
│   ├── layout/         # shell e proteção de rotas
│   └── ui/             # estados compartilhados
├── hooks/              # sessão e projeto selecionado
├── pages/              # páginas roteáveis
├── services/           # Supabase e API GlobalScore
├── styles/             # tokens, base e layout
└── test/               # configuração do Vitest
```

## Limites conhecidos da Etapa 4A

- a API oferece consulta de avaliação por ID, mas ainda não oferece listagem histórica;
- `GET /bases` não aceita filtro por projeto e sua resposta não expõe `projeto_id` ou `grupo_id`, o que limita a filtragem segura no frontend;
- rating e marcos de intervenção ainda não estão implementados no backend;
- o Story View está preparado para reproduzir séries progressivamente, mas permanece desabilitado enquanto houver apenas uma avaliação acessível;
- Docker do frontend será tratado depois da validação local, conforme o escopo da etapa.

## Decisões de segurança

- apenas a Publishable Key do Supabase é aceita no bundle;
- tokens são obtidos da sessão do Supabase e não são gravados pela aplicação;
- um HTTP 401 encerra a sessão local e redireciona o fluxo para nova autenticação;
- toda importação exige mapeamento e validação antes da confirmação;
- a ação DELETE visível é apresentada como **Desativar indicador**, preservando o histórico.
