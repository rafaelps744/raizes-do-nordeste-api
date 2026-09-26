# Raízes do Nordeste — API Back-end

API REST da rede de lanchonetes **Raízes do Nordeste** (Atividade Prática Uninter 2026 — Projeto Back-End).

Autor: **Rafael Santos** · RU **5118406**

Repositório público: [https://github.com/rafaelps744/raizes-do-nordeste-api](https://github.com/rafaelps744/raizes-do-nordeste-api)

## O que esta API entrega (MVP — Fluxo A)

Pedido → pagamento mock → atualização de status, com persistência em SQLite.

Também inclui: JWT e perfis, `canalPedido` (APP, TOTEM, BALCAO, PICKUP, WEB), estoque por unidade, fidelidade com consentimento, promoção `NORDESTE10`, logs de auditoria, Swagger e erro JSON padronizado.

## Requisitos

- Node.js 20+ (testado com 24)
- npm

O banco padrão é **SQLite** (`prisma/dev.db`), então não é necessário instalar PostgreSQL para rodar o projeto.

## Variáveis de ambiente

Copie o arquivo de exemplo:

```bash
copy .env.example .env
```


| Variável         | Descrição                                |
| ---------------- | ---------------------------------------- |
| `PORT`           | Porta HTTP (padrão `3000`)               |
| `DATABASE_URL`   | Caminho do SQLite (ex.: `file:./dev.db`) |
| `JWT_SECRET`     | Segredo do token                         |
| `JWT_EXPIRES_IN` | Validade do token (padrão `8h`)          |




## Como executar

1. Instalar dependências:

```bash
npm install
```

1. Gerar cliente Prisma, criar tabelas e popular seed:

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run seed
```

O arquivo do banco será criado em `prisma/dev.db`.

1. Iniciar a API:

```bash
npm run start:dev
```

- Health: [http://localhost:3000/health](http://localhost:3000/health)  
- **Swagger:** [http://localhost:3000/docs](http://localhost:3000/docs)



## Usuários do seed

Senha de todos: `Senha@123`


| E-mail                 | Perfil    |
| ---------------------- | --------- |
| `cliente@raizes.com`   | CLIENTE   |
| `atendente@raizes.com` | ATENDENTE |
| `cozinha@raizes.com`   | COZINHA   |
| `gerente@raizes.com`   | GERENTE   |
| `admin@raizes.com`     | ADMIN     |


Unidade `1` (Recife) já possui cardápio e estoque. Campanha: código `NORDESTE10` (10%).

## Testes

Automatizados (regras de domínio):

```bash
npm test
```

Coleção Postman (fluxo principal + erros):

- Arquivo: `[postman/Raizes_do_Nordeste.postman_collection.json](postman/Raizes_do_Nordeste.postman_collection.json)`
- Importe no Postman, rode **na ordem das pastas** (Auth → Pedidos → Pagamento → Erros → Cozinha e auditoria).
- O token JWT é gravado automaticamente após o login.



### Ordem sugerida dos cenários

1. T01 Login válido (cliente)
2. T01b / T01c Login gerente e cozinha
3. T02 Listar pedidos sem token (401)
4. T03 Criar pedido TOTEM (201)
5. T04 Produto inexistente (404)
6. T05 Estoque insuficiente (409)
7. T06 Sem `canalPedido` (400/422)
8. T09 Pagamento aprovado (pedido `RECEBIDO`)
9. T10 + T11 Pagamento recusado
10. T12 Cliente altera status (403)
11. T13 Cozinha `EM_PREPARO`
12. T14 Logs de auditoria



## Organização em camadas

```
src/
  domain/           entidades de regra (enums, transições, cálculos)
  application/      casos de uso (pedido, pagamento, estoque, auth)
  infrastructure/   Prisma, gateway de pagamento mock, auditoria
  api/              controllers, DTOs, JWT, filtro de erro, Swagger
```



## Contrato de erro

```json
{
  "error": "ESTOQUE_INSUFICIENTE",
  "message": "Não há quantidade suficiente para um ou mais itens.",
  "details": [{ "field": "itens[0].quantidade", "issue": "Disponível: 1" }],
  "timestamp": "2026-02-05T12:00:00Z",
  "path": "/pedidos"
}
```

