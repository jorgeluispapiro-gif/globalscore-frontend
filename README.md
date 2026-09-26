# GlobalScore — Frontend Web

> **MEASURE | COMPARE | ADVANCE**  
> Interface web responsiva do MVP GlobalScore para avaliação comparativa de desempenho, importação assistida de dados, dashboard executivo e exportação de relatório.

![Arquitetura do GlobalScore](docs/arquitetura.svg)

---

## 1. Visão geral

O **GlobalScore Frontend** é a camada de apresentação e interação do sistema. A matemática de percentis, pesos e Global Score não é recalculada no navegador: os valores exibidos são produzidos pela API backend.

### Funcionalidades entregues

- autenticação por e-mail e senha via Supabase Auth;
- sessão persistida, logout e rotas protegidas;
- seleção e gestão de projetos;
- consulta de grupos comparáveis;
- gestão de entidades e indicadores;
- importação assistida incremental de CSV/XLSX;
- criação, processamento, ajuste de pesos e ativação de Bases de Referência;
- processamento de avaliações em lote;
- dashboard macro → micro;
- ranking no modo `ENTRE_ENTIDADES`;
- radar comparativo com seleção de unidades da mesma Base e período, na escala percentílica de 0 a 100;
- modo `HISTORICO_ENTIDADE` sem ranking artificial;
- Global Score na escala **0 a 100**;
- evolução temporal da entidade;
- diagnóstico dos indicadores;
- eventos gerenciais;
- nota executiva determinística;
- exportação de relatório A4 via impressão do navegador.

O frontend não atribui ratings ou faixas conceituais nesta versão.

---

## 2. Tecnologias

- React 19
- React Router
- Vite 8
- JavaScript
- Recharts
- Supabase JavaScript Client
- CSS próprio
- Vitest
- React Testing Library
- Oxlint
- Docker

---

## 3. Estrutura

```text
.
├── Dockerfile
├── .dockerignore
├── README.md
├── docs/
│   └── arquitetura.svg
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── charts/
│   │   ├── dashboard/
│   │   ├── layout/
│   │   └── ui/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   ├── styles/
│   ├── test/
│   └── utils/
└── vite.config.js
```

---

## 4. Execução local

### Pré-requisito

Node.js 20.19 ou superior.

### Instalação

```bash
npm install
cp .env.example .env
```

Configure o `.env`:

```dotenv
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica
VITE_GLOBALSCORE_API_URL=/api
VITE_GLOBALSCORE_PROXY_TARGET=http://127.0.0.1:5000
```

Inicie:

```bash
npm run dev
```

A aplicação fica em `http://localhost:5173`.

Durante o desenvolvimento, o Vite encaminha `/api` para `VITE_GLOBALSCORE_PROXY_TARGET`. O backend deve estar ativo para atender essas requisições.

---

## 5. Qualidade

```bash
npm test
npm run lint
npm run build
```

Validação realizada no fechamento acadêmico:

- **14 arquivos de teste**
- **63 testes automatizados passando**
- **0 warnings e 0 erros no lint**
- **build Vite concluído com sucesso**

---

## 6. Docker

### Build

```bash
docker build -t globalscore-frontend .
```

O `Dockerfile` executa o Vite no container e expõe a porta 5173.

### Execução isolada

Para usar o backend executado no host:

```bash
docker run --rm \
  -p 5173:5173 \
  --env-file .env \
  -e VITE_GLOBALSCORE_PROXY_TARGET=http://host.docker.internal:5000 \
  globalscore-frontend
```

### Frontend e backend na mesma rede Docker

Crie a rede uma única vez:

```bash
docker network create globalscore-net
```

No repositório do backend:

```bash
docker run --rm \
  --network globalscore-net \
  --name globalscore-api \
  -p 5000:5000 \
  -v globalscore_dados:/app/dados \
  --env-file backend/.env \
  globalscore-api
```

No repositório do frontend:

```bash
docker run --rm \
  --network globalscore-net \
  --name globalscore-frontend \
  -p 5173:5173 \
  --env-file .env \
  -e VITE_GLOBALSCORE_PROXY_TARGET=http://globalscore-api:5000 \
  globalscore-frontend
```

Docker Compose não é obrigatório para o MVP.

---

## 7. Comunicação com backend e autenticação

Fluxo de autenticação:

1. usuário informa e-mail e senha;
2. o cliente Supabase autentica no serviço externo;
3. o Supabase retorna um `access_token`;
4. o cliente HTTP do GlobalScore envia `Authorization: Bearer <token>` à API Flask;
5. o backend valida o token no Supabase Auth;
6. com token válido, o backend processa a requisição;
7. um HTTP 401 encerra a sessão local no frontend.

O Supabase é usado para autenticação. Os dados de domínio permanecem na API GlobalScore e no SQLite do backend.

---

## 8. Fluxos principais da interface

### Projetos e domínio

A aplicação permite selecionar projeto e trabalhar com entidades, indicadores e grupos comparáveis usados nas análises.

### Importação

O fluxo de importação conduz o usuário por:

- upload de CSV/XLSX;
- preview;
- configuração de leitura;
- mapeamento de colunas;
- validação/dry-run;
- revisão de alertas;
- confirmação do lote.

### Bases e avaliações

Na área de Avaliações, o usuário pode:

- criar uma Base de Referência;
- escolher comparação entre entidades ou histórico da própria entidade;
- processar a Base;
- revisar população e indicadores;
- ajustar pesos;
- ativar a Base;
- processar resultados em lote por intervalo mensal.

### Dashboard

O Dashboard mostra:

- universo e quantidade de entidades avaliadas;
- resultados incompletos;
- grupo e Base de Referência usados;
- ranking no modo `ENTRE_ENTIDADES`;
- ausência explícita de ranking no modo `HISTORICO_ENTIDADE`;
- Global Score da entidade na escala 0–100;
- evolução histórica na mesma Base;
- eventos associados aos períodos;
- nota executiva determinística;
- diagnóstico dos indicadores;
- exportação do relatório em layout A4.

Eventos são apresentados como fatos do período. A interface não afirma que um evento causou alteração no desempenho.

---

## 9. Decisões de arquitetura

- o backend é a fonte de verdade para a matemática;
- o frontend não duplica o cálculo de percentis ou Global Score;
- dados ausentes são exibidos como ausência, não como score zero;
- comunicação com a API ocorre por HTTP/JSON;
- autenticação usa Bearer token emitido pelo Supabase Auth;
- o proxy do Vite é usado no ambiente local e no container acadêmico do frontend.

---

## 10. Limitações do MVP

- o login depende de conectividade com o Supabase Auth;
- a execução via Vite é adequada ao desenvolvimento e à demonstração acadêmica, não representa uma configuração de produção em larga escala;
- o frontend não implementa rating/faixas conceituais;
- Docker Compose não é necessário para executar os componentes.

---

## 11. Atendimento aos requisitos acadêmicos

| Requisito | Evidência no GlobalScore |
|---|---|
| Frontend independente | Este repositório público: [globalscore-frontend](https://github.com/jorgeluispapiro-gif/globalscore-frontend) |
| API própria independente | Repositório público: [globalscore-api](https://github.com/jorgeluispapiro-gif/globalscore-api) |
| API externa pública | Supabase Auth, com plano Free, usado para login e validação da sessão |
| Comunicação entre componentes | HTTP/JSON com Bearer token; proxy `/api` no desenvolvimento |
| Persistência permitida | SQLite gerenciado pelo backend com SQLAlchemy |
| Métodos HTTP no frontend | GET, POST, PATCH e DELETE são usados em fluxos reais, incluindo Indicadores e Eventos |
| API própria com documentação | Flask-RESTX com Swagger UI em `/docs` |
| Containerização | Um `Dockerfile` em cada repositório |
| Documentação de execução | README próprio no frontend e no backend |
| Imagem da arquitetura | Diagrama exibido no início deste README |

A API externa, suas rotas, o cadastro, o plano e as condições de uso estão
documentados no [README do backend](https://github.com/jorgeluispapiro-gif/globalscore-api#9-autenticação-e-serviço-externo).

O vídeo acadêmico de até seis minutos é um artefato externo aos repositórios e
deve ser gravado e entregue conforme o roteiro da disciplina.
