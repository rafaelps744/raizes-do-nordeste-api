export const CANAIS_PEDIDO = [
  'APP',
  'TOTEM',
  'BALCAO',
  'PICKUP',
  'WEB',
] as const;

export type CanalPedido = (typeof CANAIS_PEDIDO)[number];

export const STATUS_PEDIDO = [
  'AGUARDANDO_PAGAMENTO',
  'PAGAMENTO_RECUSADO',
  'RECEBIDO',
  'EM_PREPARO',
  'PRONTO',
  'ENTREGUE',
  'CANCELADO',
] as const;

export type StatusPedido = (typeof STATUS_PEDIDO)[number];

export const TRANSICOES_STATUS: Record<StatusPedido, StatusPedido[]> = {
  AGUARDANDO_PAGAMENTO: ['PAGAMENTO_RECUSADO', 'RECEBIDO', 'CANCELADO'],
  PAGAMENTO_RECUSADO: ['AGUARDANDO_PAGAMENTO', 'CANCELADO'],
  RECEBIDO: ['EM_PREPARO', 'CANCELADO'],
  EM_PREPARO: ['PRONTO', 'CANCELADO'],
  PRONTO: ['ENTREGUE', 'CANCELADO'],
  ENTREGUE: [],
  CANCELADO: [],
};

export const PERFIS = [
  'CLIENTE',
  'ATENDENTE',
  'COZINHA',
  'GERENTE',
  'ADMIN',
] as const;

export type Perfil = (typeof PERFIS)[number];
