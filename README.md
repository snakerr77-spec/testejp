# J&P Serviços Ltda. — credenciamento médico

Projeto React + TypeScript + Vite com formulários públicos para médicos e colaboradores, painel administrativo e API no **Cloudflare Pages Functions**. A nova marca foi incorporada a partir do material enviado pela J&P.

## O que mudou

- Formulário médico com especialidade e cidade em listas, modalidade **Mutirão / Fixo / Plantões** e dados opcionais de empresa: CNPJ, cartão CNPJ e conta para recebimento.
- Texto institucional, identificação da empresa, selos "Site oficial J&P", "Site seguro (SSL/TLS)" e "Dados protegidos (LGPD)" que descrevem recursos reais (não são certificações de terceiros) e rodapé com informação de LGPD e aviso de privacidade.
- Candidaturas e agenda persistidas em **D1**; documentos em **R2 privado**; acesso ao painel por sessão administrativa assinada em cookie HttpOnly. O antigo login de demonstração foi removido.
- Login administrativo em duas etapas: senha e código MFA de uso único enviado ao e-mail; perfis individuais e situação ativa/inativa dos colaboradores no D1.
- Sessões administrativas de uma hora, MFA válido por dez minutos, uso único, limite de tentativas e bloqueio do acesso administrativo pelos domínios de pré-visualização `pages.dev`.
- Arquivos são validados no servidor (PDF/JPG/PNG, 10 MB cada e 70 MB no total). Nenhum envio é considerado concluído antes de o servidor confirmar o registro.

## Publicar no Cloudflare Pages pelo GitHub

1. Envie os arquivos deste projeto a um repositório GitHub. Não envie `.dev.vars`, `wrangler.toml`, `node_modules` ou `.wrangler`.
2. Na sua conta Cloudflare, crie um banco **D1** (por exemplo, `jp-credenciamento`) e um bucket **R2 privado** (por exemplo, `jp-credenciamento-documentos`). Não habilite domínio público para o bucket.
3. No **D1 > Console**, execute o conteúdo de [`schema.sql`](schema.sql) no banco criado. Além das tabelas da aplicação, ele cria `staff_profiles` e `mfa_challenges`. Se já existe um banco, execute as migrações pendentes em ordem numérica: [`migrations/0002_staff_mfa.sql`](migrations/0002_staff_mfa.sql) e [`migrations/0003_staff_password_hash.sql`](migrations/0003_staff_password_hash.sql).
4. Em **Workers & Pages > Create > Pages > Connect to Git**, escolha o repositório e a branch `main`:

   | Opção | Valor |
   | --- | --- |
   | Framework | Vite |
   | Comando de build | `npm run build` |
   | Diretório de saída | `dist` |
   | Diretório raiz | `/` |

5. Em **Pages > seu projeto > Settings > Bindings**, configure o D1 com o nome de variável **`DB`** e o R2 com o nome **`DOCUMENTS`**. Configure os ambientes **Production** e **Preview** conforme sua política; use recursos separados para testes.
6. Configure o provedor de e-mail transacional. O código usa a API do Resend: verifique o domínio remetente no Resend, configure os registros DNS que ele fornecer e crie uma chave de envio. Em **Settings > Variables and Secrets**, cadastre `RESEND_API_KEY` como Secret e `MFA_FROM` como variável, por exemplo `J&P Portal <acesso@jpcredenciamentos.com.br>`. A conta Cloudflare atual não tem envio nativo habilitado no plano atual.
7. Em **Settings > Variables and Secrets**, mantenha `SESSION_SECRET` como Secret com pelo menos 32 caracteres. `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `ADMIN_USERS` continuam aceitos para contas existentes; novos colaboradores podem autenticar com hash de senha armazenado no D1. Gere uma chave de sessão, por exemplo, com `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Não coloque valores reais no repositório.
8. **Faça um novo deploy** depois de adicionar bindings, migrações e secrets. O login administrativo deve ser acessado pelo domínio `https://jpcredenciamentos.com.br`; chamadas de autenticação em `pages.dev` são recusadas.

### Adicionar colaboradores

Gere um hash localmente, sem exibir nem salvar a senha em texto simples:

```bash
node scripts/hash-staff-password.mjs
```

No **D1 > Console**, cadastre nome, cargo, e-mail, telefone e o hash produzido:

```sql
INSERT INTO staff_profiles (email, full_name, role, phone, password_hash, active)
VALUES ('colaborador@empresa.com', 'Nome Completo', 'Cargo', '', 'pbkdf2-sha256$310000$SALT$HASH', 1);
```

Use o hash completo gerado pelo script no lugar do exemplo. Novos colaboradores não precisam ser adicionados ao Secret `ADMIN_USERS`; o D1 guarda somente o hash PBKDF2-SHA-256 com salt aleatório individual. As contas antigas ainda configuradas em `ADMIN_USERS` continuam aceitas. O MFA é enviado ao e-mail do colaborador; o campo `active` deve permanecer em `1` para permitir o acesso. Defina-o como `0` para desativar uma pessoa; as sessões existentes dessa conta passam a ser recusadas.

O MFA usa códigos aleatórios de seis dígitos, armazenados no D1 apenas como HMAC, expira em dez minutos, aceita até cinco tentativas e só pode ser usado uma vez. A sessão assinada é HttpOnly, SameSite Strict, Secure em HTTPS e expira em uma hora.

O diretório `functions/` é publicado junto ao projeto Git no Cloudflare Pages. Sem D1, R2, `SESSION_SECRET` e as credenciais de envio de e-mail, o login MFA não pode ser concluído. O antigo site no GitHub Pages não executa essas funções.

## Rodar localmente com a API

Requer Node.js 22 ou superior.

```bash
npm install
cp wrangler.toml.example wrangler.toml
cp .dev.vars.example .dev.vars
```

Edite `.dev.vars` com credenciais locais e com as credenciais de um remetente já verificado no Resend. Em seguida:

```bash
npm run db:local
npm run dev:cloudflare
```

Abra `http://localhost:8788/#/candidatura/medico`. O banco e os arquivos de desenvolvimento ficam apenas no seu computador. `npm run dev` abre somente a interface Vite, sem a API de cadastro. `npm run check` valida TypeScript; `npm run build` gera `dist`.

`wrangler.toml.example` é um modelo **somente para desenvolvimento local**, com identificador fictício. A cópia `wrangler.toml` é ignorada pelo Git e não deve ir para produção: um arquivo Wrangler enviado ao repositório passa a controlar a configuração do Pages e pode substituir os bindings definidos no painel.

## Antes de receber candidaturas reais

Revise o [aviso de privacidade](public/privacidade.html), defina prazo de retenção e fluxo de exclusão/atendimento às solicitações de titulares, e confirme os canais de contato com a J&P. O texto do site descreve o transporte por HTTPS e o acesso restrito implementado; não representa uma certificação independente de segurança ou uma declaração de conformidade jurídica integral.

Os cadastros feitos na versão anterior do GitHub Pages eram guardados no armazenamento **do navegador e daquele domínio**. Por isolamento entre origens, eles não migram automaticamente para D1. Preserve/exporte os dados antigos antes de desativar o site anterior, caso existam candidaturas reais.
