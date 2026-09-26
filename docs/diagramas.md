# Diagramas — Raízes do Nordeste

Figuras em `docs/figuras/` (também no PDF acadêmico). Gerar de novo: `python scripts/gerar_diagramas.py`.

## Casos de uso

Arquivo: `docs/figuras/casos_de_uso.png`

Atores: Cliente (App/Web/Totem), Atendente, Cozinha, Gerente/Admin, Gateway de pagamento (mock).

Casos: autenticar, consultar cardápio, realizar pedido, solicitar pagamento, atualizar status, cancelar, movimentar estoque, fidelidade, auditar.

O fluxo crítico (pedido + pagamento) está detalhado no Anexo A do relatório.

```mermaid
flowchart LR
  Cliente --> UC1[Consultar cardápio]
  Cliente --> UC2[Realizar pedido]
  Cliente --> UC3[Solicitar pagamento]
  Atendente --> UC2
  Cozinha --> UC4[Atualizar status]
  Gerente --> UC5[Estoque]
  Gerente --> UC6[Auditoria]
  UC3 --> Gateway[Gateway mock]
```

## Sequência do fluxo crítico

Arquivo: `docs/figuras/sequencia.png`

```mermaid
sequenceDiagram
  actor C as Cliente
  participant API as API
  participant Dom as Application
  participant DB as SQLite
  participant GW as Gateway mock

  C->>API: POST /pedidos (canalPedido)
  API->>Dom: validar itens, estoque, canal
  Dom->>DB: reserva estoque + grava pedido
  DB-->>C: 201 AGUARDANDO_PAGAMENTO
  C->>API: POST /pagamentos
  API->>GW: envio mock
  GW-->>API: APROVADO ou RECUSADO
  alt aprovado
    API->>DB: pagamento + status RECEBIDO + pontos
  else recusado
    API->>DB: pagamento + PAGAMENTO_RECUSADO + estorno
  end
```

## DER

Arquivo: `docs/figuras/der.png` (entregável visual pedido no roteiro).

- Unidade 1-N CardapioUnidade N-1 Produto
- Unidade 1-N Estoque N-1 Produto (estoque próprio)
- Usuario 0-N Pedido N-1 Unidade
- Pedido 1-N ItemPedido N-1 Produto
- Pedido 1-1 Pagamento (desacoplado)
- Usuario 0-1 ContaFidelidade 1-N MovimentoFidelidade
- Usuario 0-N Consentimento / LogAuditoria
- Pedido.canalPedido: APP | TOTEM | BALCAO | PICKUP | WEB

Fonte de verdade das colunas: `prisma/schema.prisma`.

## Arquitetura e classes

- `docs/figuras/arquitetura.png` — Domain / Application / Infrastructure / API
- `docs/figuras/classes.png` — visão de domínio (Pedido, Estoque, PagamentoMock, pedido-regras)
