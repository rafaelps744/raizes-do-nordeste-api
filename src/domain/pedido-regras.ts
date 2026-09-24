import {
  CANAIS_PEDIDO,
  TRANSICOES_STATUS,
  type CanalPedido,
  type StatusPedido,
} from './enums.js';

export class RegraNegocioError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details: Array<{ field: string; issue: string }> = [],
    public readonly httpStatus = 409,
  ) {
    super(message);
    this.name = 'RegraNegocioError';
  }
}

export function validarCanalPedido(canal: string | undefined): CanalPedido {
  if (!canal) {
    throw new RegraNegocioError(
      'CANAL_PEDIDO_OBRIGATORIO',
      'O campo canalPedido é obrigatório.',
      [{ field: 'canalPedido', issue: 'Campo obrigatório' }],
      422,
    );
  }
  if (!CANAIS_PEDIDO.includes(canal as CanalPedido)) {
    throw new RegraNegocioError(
      'CANAL_PEDIDO_INVALIDO',
      'canalPedido deve ser APP, TOTEM, BALCAO, PICKUP ou WEB.',
      [{ field: 'canalPedido', issue: `Valor inválido: ${canal}` }],
      422,
    );
  }
  return canal as CanalPedido;
}

export function podeTransicionar(
  atual: StatusPedido,
  destino: StatusPedido,
): boolean {
  return TRANSICOES_STATUS[atual].includes(destino);
}

export function validarTransicao(atual: StatusPedido, destino: StatusPedido) {
  if (!podeTransicionar(atual, destino)) {
    throw new RegraNegocioError(
      'TRANSICAO_STATUS_INVALIDA',
      `Não é permitido alterar o pedido de ${atual} para ${destino}.`,
      [{ field: 'status', issue: `Transição ${atual} → ${destino} não permitida` }],
      409,
    );
  }
}

export function calcularSubtotal(
  itens: Array<{ quantidade: number; precoUnitario: number }>,
): number {
  return Number(
    itens
      .reduce((acc, item) => acc + item.quantidade * item.precoUnitario, 0)
      .toFixed(2),
  );
}

export function aplicarDescontoPercentual(
  total: number,
  percentual: number,
): { desconto: number; totalFinal: number } {
  const desconto = Number(((total * percentual) / 100).toFixed(2));
  return { desconto, totalFinal: Number((total - desconto).toFixed(2)) };
}

export function pontosPorValorPago(total: number): number {
  return Math.floor(total);
}
