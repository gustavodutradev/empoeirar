# Empoeirar

Loja virtual da Empoeirar, marca de moldes e ferramentas de madeira (MDF) para ceramistas, feitos à mão em Belo Horizonte.

Catálogo com variantes, carrinho sincronizado entre dispositivos, checkout com cálculo de frete, pagamento pelo Mercado Pago, acompanhamento do pedido em linha do tempo e um painel administrativo para produtos e pedidos.

**Produção:** [empoeirar.com.br](https://empoeirar.com.br)

---

## Sumário

- [Funcionalidades](#funcionalidades)
- [Stack](#stack)
- [Arquitetura](#arquitetura)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Rodando localmente](#rodando-localmente)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Scripts](#scripts)
- [Banco de dados](#banco-de-dados)
- [Integrações](#integrações)
- [Painel administrativo](#painel-administrativo)
- [Segurança](#segurança)
- [Qualidade de código](#qualidade-de-código)
- [Deploy](#deploy)
- [Solução de problemas](#solução-de-problemas)
- [Roadmap](#roadmap)
- [Licença](#licença)

---

## Funcionalidades

**Loja**

- Catálogo por categoria, com produtos de múltiplas variantes (tamanho, conjunto) e preço, dimensões e peso por variante.
- Página de produto com galeria de fotos (setas, miniaturas e gesto de deslizar no celular).
- Carrinho persistido no navegador e sincronizado com a conta ao fazer login, sem misturar carrinhos de usuários diferentes no mesmo aparelho.
- Checkout com preenchimento de endereço pelo CEP e cotação de frete em tempo real.
- Pagamento via Mercado Pago Checkout Pro, com os meios habilitados na conta vendedora (cartão, Pix e outros).
- Página do pedido com linha do tempo: recebido, pago, em preparação, enviado e entregue.
- E-mails transacionais a cada mudança de status.
- Páginas institucionais e legais: quem somos, como comprar, FAQ, trocas e devoluções, política de envio, privacidade (LGPD) e termos.

**Conta**

- Login sem senha, com código de 6 dígitos enviado por e-mail.
- Histórico de pedidos e dados de entrega reaproveitados na compra seguinte.

**Administração**

- Listagem e detalhe de pedidos, com avanço manual de status (preparação, envio, entrega).
- Cadastro e edição de produtos e variantes.
- Upload de fotos com compressão no navegador, escolha de capa e remoção.

---

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router, Server Components, Server Actions) |
| Linguagem | TypeScript 5 |
| UI | React 19, Tailwind CSS 4, componentes no padrão shadcn/ui, ícones Lucide |
| Estado no cliente | Zustand (carrinho) |
| Validação | Zod 4, t3-env para variáveis de ambiente |
| Banco, autenticação e arquivos | [Supabase](https://supabase.com) (Postgres 17, Auth, Storage) |
| Pagamentos | Mercado Pago Checkout Pro |
| Frete | Melhor Envio (cotação) e ViaCEP (endereço) |
| E-mail | Nodemailer via SMTP |
| Hospedagem | Vercel |
| Lint e formatação | Biome |
| Git hooks | Lefthook, com Secretlint e typecheck |
| Gerenciador de pacotes | pnpm 10 |

---

## Arquitetura

O app é um único projeto Next.js. Páginas públicas e de conta são Server Components que leem o banco pela chave anônima do Supabase, sempre sob Row Level Security. Tudo que escreve dados passa por Server Actions no servidor e, quando envolve mais de uma tabela, por funções do Postgres (`SECURITY DEFINER`) que fazem a operação de forma atômica.

A chave `service_role`, que ignora a RLS, só é usada em três pontos do servidor: o webhook de pagamento, o envio de e-mails e o upload de fotos.

### Fluxo de compra

```mermaid
sequenceDiagram
    actor Cliente
    participant App as Next.js (Vercel)
    participant DB as Supabase (Postgres)
    participant ME as Melhor Envio
    participant MP as Mercado Pago

    Cliente->>App: Preenche CEP no checkout
    App->>ME: Cota o frete (peso e dimensões das variantes)
    ME-->>App: Opções de frete
    Cliente->>App: Cria o pedido
    App->>DB: create_order (preços recalculados no banco)
    Cliente->>App: Pagar
    App->>MP: Cria a preference (itens + frete, external_reference = id do pedido)
    MP-->>Cliente: Checkout Pro
    MP->>App: Webhook /api/webhooks/mercadopago (assinado)
    App->>MP: Consulta o pagamento (fonte da verdade)
    App->>DB: advance_order_status (confere o valor pago)
    App-->>Cliente: E-mail de pagamento confirmado
```

Pontos que valem registro:

- O preço nunca vem do navegador. O cliente envia apenas `variantId` e quantidade; o valor é buscado no banco.
- O frete entra na preference como um item de linha. O campo `shipments.cost` do Checkout Pro não é confiável quando o frete é calculado fora do Mercado Pago.
- O webhook é idempotente: `advance_order_status` retorna se houve transição, e o e-mail só é enviado quando houve. Reenvios do Mercado Pago não duplicam notificações.

---

## Estrutura do projeto

```
.
├── public/                  Logo e fotos de produto usadas como fallback
├── src/
│   ├── app/                 Rotas (App Router)
│   │   ├── admin/           Painel: pedidos e produtos
│   │   ├── api/
│   │   │   ├── cep/[cep]/   Proxy do ViaCEP com rate limit
│   │   │   ├── health/      Healthcheck
│   │   │   └── webhooks/mercadopago/
│   │   ├── carrinho/  checkout/  conta/  entrar/  pedido/[id]/
│   │   ├── produtos/        Listagem e página de produto
│   │   └── ...              Páginas institucionais e legais
│   ├── components/
│   │   ├── site/            Componentes da loja e do admin
│   │   └── ui/              Primitivos (Button, Input)
│   ├── lib/
│   │   ├── admin/           Guard e Server Actions do painel
│   │   ├── auth/            Sessão do visitante e redirect seguro
│   │   ├── cart/            Store do carrinho e sincronização
│   │   ├── checkout/        Criação de pedido, schema e status
│   │   ├── email/           Envio e templates
│   │   ├── payments/        Mercado Pago e verificação do webhook
│   │   ├── queries/         Leitura do catálogo
│   │   ├── security/        Content Security Policy
│   │   ├── shipping/        Melhor Envio
│   │   ├── supabase/        Clientes (browser, servidor, admin, middleware)
│   │   ├── rate-limit.ts
│   │   └── site-config.ts   Nome, contatos e navegação
│   ├── env.ts               Validação das variáveis de ambiente
│   └── middleware.ts        Sessão do Supabase e CSP com nonce
└── supabase/
    ├── config.toml          Configuração do ambiente local
    ├── migrations/          Schema, RLS e funções
    ├── seed.sql             Categorias, produtos e variantes iniciais
    └── templates/otp.html   E-mail do código de login
```

---

## Rodando localmente

### Pré-requisitos

- Node.js 20 ou superior
- pnpm 10 (`corepack enable` já disponibiliza a versão fixada no `package.json`)
- Docker, para o Supabase local

### Passo a passo

```bash
# 1. Clonar e instalar
git clone git@github.com:gustavodutradev/empoeirar.git
cd empoeirar
pnpm install

# 2. Subir o Supabase local (Postgres, Auth, Storage e caixa de e-mail de teste)
pnpm exec supabase start

# 3. Aplicar migrações e seed
pnpm exec supabase db reset

# 4. Configurar as variáveis
cp .env.example .env.local
```

O `supabase start` imprime a `API URL`, a `anon key` e a `service_role key`. Copie esses valores para o `.env.local`.

Crie no Storage um bucket público chamado `produtos` (pelo Studio em `http://127.0.0.1:54323`). As fotos cadastradas pelo painel vão para ele.

```bash
# 5. Rodar
pnpm dev
```

A loja fica em `http://localhost:3000`.

### Serviços locais

| Serviço | Endereço |
| --- | --- |
| Loja | http://localhost:3000 |
| API do Supabase | http://127.0.0.1:54321 |
| Supabase Studio | http://127.0.0.1:54323 |
| Caixa de e-mail de teste | http://127.0.0.1:54324 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

O código de login chega na caixa de e-mail de teste, não em um e-mail real.

Mercado Pago, Melhor Envio e SMTP são opcionais no ambiente local. Sem eles, o checkout mostra "frete a calcular", o pagamento não é oferecido e os e-mails são apenas registrados no log.

---

## Variáveis de ambiente

As variáveis são validadas em `src/env.ts` no build e na inicialização. Se faltar uma obrigatória, o processo para com erro.

| Variável | Obrigatória | Exposta ao navegador | Descrição |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | Sim | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | Sim | Chave anônima, protegida pela RLS |
| `NEXT_PUBLIC_SITE_URL` | Sim | Sim | URL canônica, usada em SEO e nas URLs de retorno do pagamento |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Não | Chave que ignora a RLS. Somente no servidor |
| `MERCADOPAGO_ACCESS_TOKEN` | Não | Não | Access token da conta vendedora |
| `MERCADOPAGO_WEBHOOK_SECRET` | Não | Não | Segredo que valida a assinatura do webhook |
| `MELHORENVIO_TOKEN` | Não | Não | Token de acesso do Melhor Envio |
| `MELHORENVIO_SANDBOX` | Não | Não | `true` (padrão) usa o sandbox; `false`, produção |
| `MELHORENVIO_FROM_CEP` | Não | Não | CEP de origem dos envios |
| `SMTP_USER` | Não | Não | Usuário SMTP (conta Gmail) |
| `SMTP_PASS` | Não | Não | Senha de app do Gmail |

Nenhum segredo usa o prefixo `NEXT_PUBLIC_`. Em produção, os valores ficam nas variáveis de ambiente da Vercel, nunca no repositório.

---

## Scripts

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` | Build de produção (valida as variáveis de ambiente) |
| `pnpm start` | Sobe o build de produção |
| `pnpm typecheck` | Checagem de tipos com `tsc --noEmit` |
| `pnpm lint` | Lint com Biome |
| `pnpm format` | Formata o código com Biome |
| `pnpm check` | Lint e formatação com correção automática |
| `pnpm secrets` | Procura segredos commitados por engano |

---

## Banco de dados

O schema é versionado em `supabase/migrations`. Toda mudança no banco entra por migração, nunca pelo painel.

### Tabelas

| Tabela | Conteúdo |
| --- | --- |
| `profile` | Dados do usuário e papel (`customer` ou `admin`) |
| `category` | Categorias do catálogo |
| `product` | Produtos, com status `draft`, `published` ou `archived` |
| `product_variant` | Variantes com preço, peso e dimensões |
| `product_image` | Fotos no Storage, com capa e ordem |
| `cart_item` | Carrinho do usuário logado |
| `customer_order` | Pedidos, com snapshot do endereço e dos valores |
| `order_item` | Itens do pedido, com preço congelado no momento da compra |
| `order_status_event` | Histórico de status (a linha do tempo do cliente) |
| `audit_log` | Registro de ações administrativas |
| `rate_limit` | Contadores de requisições por janela de tempo |

### Funções

| Função | Uso |
| --- | --- |
| `create_order` | Cria o pedido e os itens, recalculando os preços no banco |
| `attach_order_preference` | Vincula a preference do Mercado Pago ao pedido |
| `advance_order_status` | Avança o status e registra o evento; retorna se houve mudança |
| `create_product` | Cria produto e variantes em uma única transação |
| `is_admin` | Verifica se o usuário atual é administrador |
| `rate_limit_hit` | Conta uma requisição e diz se ela está dentro do limite |
| `handle_new_user` | Cria o `profile` quando um usuário se cadastra |

### Criando uma migração

```bash
pnpm exec supabase migration new nome_da_mudanca
# edite o arquivo criado em supabase/migrations/
pnpm exec supabase db reset      # reaplica tudo localmente
```

Para aplicar em produção:

```bash
pnpm exec supabase link --project-ref <ref-do-projeto>
pnpm exec supabase db push
```

---

## Integrações

### Mercado Pago

A integração usa o Checkout Pro. O pedido é criado antes, e o pagamento é iniciado a partir da página do pedido.

Configuração no painel do Mercado Pago (Suas integrações, Webhooks):

- URL: `https://empoeirar.com.br/api/webhooks/mercadopago`
- Evento: Pagamentos
- O segredo gerado vai em `MERCADOPAGO_WEBHOOK_SECRET`

A URL do webhook é definida no painel, não na preference.

Para testar, use credenciais e contas de teste. O comprador também precisa ser uma conta de teste. No cartão de teste, o nome do titular define o resultado:

| Titular | Resultado |
| --- | --- |
| `APRO` | Aprovado |
| `OTHE` | Recusado |
| `CONT` | Pendente |

O Pix não aparece no ambiente de teste.

### Melhor Envio

Usado para cotar o frete a partir do peso e das dimensões de cada variante. A etiqueta de envio ainda é gerada manualmente no painel do Melhor Envio. Comece com `MELHORENVIO_SANDBOX=true`.

### ViaCEP

Preenche rua, bairro, cidade e UF a partir do CEP no checkout. A consulta passa por `/api/cep/[cep]`, que aplica rate limit por IP.

### E-mail

Quatro e-mails transacionais: pedido recebido, pagamento confirmado, pedido enviado e pedido entregue. O envio é tolerante a falhas: se o SMTP estiver fora do ar, o pedido segue normalmente e o erro fica no log. Todo conteúdo dinâmico é escapado nos templates.

---

## Painel administrativo

Disponível em `/admin` para usuários com papel `admin`.

| Rota | Função |
| --- | --- |
| `/admin/pedidos` | Lista de pedidos |
| `/admin/pedidos/[id]` | Detalhe e avanço de status |
| `/admin/produtos` | Lista de produtos |
| `/admin/produtos/novo` | Cadastro de produto |
| `/admin/produtos/[id]` | Edição de dados, variantes e fotos |

O papel de administrador não pode ser alterado pelo próprio usuário. A promoção é feita por uma lista de e-mails definida na migração `20260821120000_admin_bootstrap.sql`. Para adicionar um administrador, crie uma nova migração que atualize essa lista e o `profile` correspondente.

---

## Segurança

- **Row Level Security** em todas as tabelas. Clientes só enxergam os próprios pedidos e carrinho; o catálogo público só expõe produtos publicados.
- **Autorização em duas camadas**: as Server Actions do admin verificam `is_admin()`, e as policies e funções do banco verificam de novo.
- **Escritas críticas no banco**, por funções `SECURITY DEFINER`, com `search_path` fixo.
- **Webhook autenticado** por HMAC-SHA256 com comparação em tempo constante. O status do pagamento é sempre consultado na API do Mercado Pago, e o valor pago é conferido com o total do pedido.
- **Content Security Policy com nonce** por requisição, aplicada no middleware, além de HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy`.
- **Login sem senha**, com mensagens de erro genéricas para não revelar se um e-mail está cadastrado, e redirecionamento pós-login restrito a caminhos internos.
- **Rate limiting** no Postgres, para funcionar em ambiente serverless: webhook, consulta de CEP, cotação de frete, criação de pedido e início de pagamento.
- **Upload de imagens** com validação de tipo e tamanho no servidor, nome de arquivo gerado por UUID e reprocessamento da imagem no navegador antes do envio.
- **Variáveis de ambiente validadas** no build. Segredos nunca são expostos ao navegador.
- **Hooks de commit** que bloqueiam segredos no código.

Para reportar uma vulnerabilidade, escreva para empoeirar@gmail.com em vez de abrir uma issue pública.

---

## Qualidade de código

Os hooks do Lefthook são instalados junto com o `pnpm install`.

| Momento | Verificação |
| --- | --- |
| `pre-commit` | Secretlint nos arquivos staged; Biome com correção automática |
| `pre-push` | Typecheck do projeto inteiro |

O projeto segue o `.editorconfig`: UTF-8, fim de linha LF e indentação de 2 espaços. No Windows, configure `git config core.autocrlf input` para evitar que o Git marque todos os arquivos como modificados.

Convenção de commits: [Conventional Commits](https://www.conventionalcommits.org/pt-br/), por exemplo `feat(admin): ...` e `fix: ...`.

---

## Deploy

O deploy é feito pela Vercel a cada push na branch `main`. Outras branches geram deploys de preview.

1. Cadastre as variáveis de ambiente na Vercel (Settings, Environment Variables).
2. Aplique as migrações pendentes com `supabase db push` antes do deploy que depende delas.
3. Confirme que o bucket `produtos` existe no Storage do projeto de produção.
4. Configure o webhook no painel do Mercado Pago apontando para o domínio de produção.

O domínio canônico é `empoeirar.com.br`, sem `www`. O `www` redireciona para ele.

---

## Solução de problemas

**O build falha com erro de variável de ambiente.**
Alguma variável obrigatória está vazia ou com formato inválido. A mensagem indica qual. Confira o `.env.local` ou as variáveis na Vercel.

**O código de login não chega.**
Localmente, ele aparece na caixa de e-mail de teste em `http://127.0.0.1:54324`. Em produção, verifique as configurações de e-mail do Supabase Auth e a caixa de spam.

**O webhook retorna 401.**
O `MERCADOPAGO_WEBHOOK_SECRET` não corresponde ao segredo do painel, ou o webhook foi configurado no modo errado (teste ou produção).

**O pagamento foi aprovado, mas o pedido não avança.**
Veja os logs da função na Vercel. Um erro `42501 permission denied` indica que falta `GRANT` para o `service_role` em alguma tabela. Ignorar a RLS não dispensa a permissão de tabela.

**O frete aparece como "a calcular".**
`MELHORENVIO_TOKEN` não está configurado. Se o token existe e a cotação falha, confira o peso e as dimensões das variantes no painel e os logs da Vercel.

**O upload de foto falha.**
Confirme que o bucket `produtos` existe e é público. O limite é de 5 MB por arquivo, nos formatos PNG, JPG e WebP.

---

## Roadmap

- Cutover do Mercado Pago para a conta de produção.
- Migrar as fotos restantes de `public/produtos` para o Storage e remover o mapa de fallback.
- Excluir variantes e reordenar fotos pelo painel.
- Geração de etiqueta e código de rastreio pelo Melhor Envio.
- Recuperação de carrinho abandonado por e-mail.
- Limpeza periódica da tabela `rate_limit`.
- E-mail no domínio próprio.

---

## Licença

Projeto privado. Todos os direitos reservados. O código, as imagens e a marca Empoeirar não podem ser reutilizados sem autorização.
