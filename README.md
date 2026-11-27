# Saúde Recife

MVP web (PWA) de **pré-triagem e agendamento de consultas** em clínicas parceiras do Recife, a partir do protótipo do Figma.

- **Back-end:** Node.js + TypeScript, Express 5, Mongoose, autenticação por JWT, validação com zod
- **Banco de dados:** MongoDB
- **Front-end:** HTML + CSS + JavaScript (módulos ES), sem framework e sem etapa de build
- **PWA:** manifest, service worker, instalável, interface responsiva (celular, tablet e desktop)

## Como rodar

Requisitos: Node.js 20+ e um MongoDB (local ou via Docker).

```bash
docker compose up -d          # sobe o MongoDB (pule se já tiver um)
npm install
cp .env.example .env          # ajuste JWT_SEGREDO e MONGODB_URI se necessário
npm run semear                # cria dados de demonstração
npm run dev                   # http://localhost:3000
```

Para testar no celular, abra `http://IP-DO-SEU-PC:3000` na mesma rede Wi-Fi. A instalação como app
exige HTTPS (ou `localhost`) — em produção, publique atrás de um proxy com certificado.

Produção: `npm run compilar && npm run iniciar` (defina `NODE_ENV=production` e um `JWT_SEGREDO` com 32+ caracteres).

### Contas de demonstração (senha `Recife@123`)

| Perfil        | Acesso                                          |
|---------------|-------------------------------------------------|
| Paciente      | `joao@saude-recife.test` ou CPF `529.982.247-25` |
| Profissional  | `luana.martins@saude-recife.test`               |
| Administrador | `admin@saude-recife.test`                       |

`npm run semear -- --reiniciar` apaga o banco e recria tudo. As clínicas e os profissionais do seed são fictícios.

## O que o sistema faz

| Requisito | Onde está |
|---|---|
| Clínicas: cadastro, consulta e busca | `/api/clinicas` · admin > Clínicas · busca por nome/bairro no agendamento |
| Profissionais: cadastro, associação a clínicas, busca por nome, clínica ou especialidade | `/api/profissionais` (`?nome=&clinica=&especialidade=`) e `PUT/DELETE /:id/clinicas/:clinicaId` |
| Especialidades: cadastro e consulta | `/api/especialidades` |
| Pacientes: cadastro e manutenção de dados básicos | auto-cadastro na tela de criar conta, edição em Perfil, gestão em admin > Pacientes |
| Login por credenciais | CPF ou e-mail + senha, JWT, "lembrar-me" (localStorage x sessionStorage) |
| Perfis e autorização | `paciente`, `profissional`, `administrador` (middlewares `autenticar` e `exigirPerfil` + checagem de posse do registro) |
| Disponibilidade dos profissionais | `/api/disponibilidades` · tela "Disponibilidade" do profissional e admin |
| Agendamento: especialidade, clínica, profissional, data e hora | fluxo em 5 etapas; horários gerados a partir da disponibilidade e já descontando os ocupados |
| Consultas: listagem e detalhes | Consultas (próximas/histórico), detalhe, agenda do profissional |
| Cancelamento | paciente, profissional ou administrador, com motivo |
| Área administrativa | painel + CRUD de especialidades, clínicas, profissionais, pacientes, disponibilidades e consultas |
| Persistência | todos os dados em MongoDB; índices únicos impedem reserva dupla do mesmo horário |

Também está implementada a **pré-triagem** do protótipo: o paciente marca sintomas, informa intensidade e duração, e recebe
uma classificação (rotina, prioritário ou urgente) e as especialidades indicadas. É uma regra simples por pontuação
(`src/servicos/triagem.ts`), com aviso de que não substitui avaliação médica.

## Estrutura

```
src/
  servidor.ts, app.ts          inicialização e montagem do Express
  configuracao/                variáveis de ambiente, conexão, mensagens de validação em português
  modelos/                     esquemas do Mongoose (Usuario, Paciente, Profissional, Clinica, ...)
  rotas/                       endpoints REST por recurso
  servicos/                    regras de negócio (agenda, triagem, contas, sessão)
  middlewares/                 autenticação/autorização e tratamento de erros
  scripts/semear.ts            dados de demonstração
publico/
  index.html, manifest.webmanifest, service-worker.js
  css/                         base, layout, componentes e páginas
  js/                          roteador (hash), api, sessão e utilitários
    componentes/               formulário, diálogo, navegação, cabeçalho, etapas...
    paginas/                   uma por tela; paginas/admin tem o CRUD genérico
testes/fluxo-api.mjs           teste de integração da API
ferramentas/gerar-icones.py    recria os ícones PNG do PWA (pip install pillow)
```

## API (resumo)

Todas as rotas ficam em `/api`, usam JSON e exigem `Authorization: Bearer <token>`, exceto login e cadastro.
Erros seguem o formato `{ "mensagem": "...", "detalhes": [{ "campo": "...", "mensagem": "..." }] }`.

```
POST   /autenticacao/entrar | /cadastrar        GET /autenticacao/eu        PUT /autenticacao/senha
GET    /especialidades            POST/PUT/DELETE (admin)
GET    /clinicas                  POST/PUT/DELETE (admin)
GET    /profissionais             POST/PUT/DELETE (admin)      GET /profissionais/:id/agenda?clinica=&inicio=&dias=
PUT|DELETE /profissionais/:id/clinicas/:clinicaId (admin)
GET    /disponibilidades          POST/PUT/DELETE (admin ou o próprio profissional)
GET    /pacientes (admin)         GET/PUT /pacientes/:id (admin ou o próprio)
POST   /agendamentos              GET /agendamentos?periodo=proximas|historico   GET /agendamentos/:id
PATCH  /agendamentos/:id/cancelar | /concluir
POST   /triagem                   GET /administracao/resumo (admin)
```

## Decisões e limites desta versão

- **Login com Google/Facebook** e **recuperação de senha** (que aparecem no protótipo) não foram implementados:
  dependem de credenciais OAuth e de envio de e-mail. A tela foi mantida só com login por CPF/e-mail.
- **Notificações** (última etapa do protótipo) não existem ainda; a confirmação aparece na própria tela.
- O mapa das clínicas é um link para o Google Maps (sem SDK, para o app funcionar offline e sem chave de API).
- O offline do PWA cobre a "casca" do app; os dados vêm sempre da API e nunca são guardados no cache (são dados de saúde).
- Ao criar ou renomear arquivos em `publico/`, atualize a lista `ARQUIVOS` e a `VERSAO` em `service-worker.js`.
- Datas e horários de consulta são guardados como texto (`AAAA-MM-DD`, `HH:mm`) no fuso de Recife, evitando erros de fuso.
