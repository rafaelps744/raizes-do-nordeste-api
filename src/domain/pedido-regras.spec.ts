import { describe, expect, it } from 'vitest';
import {
  aplicarDescontoPercentual,
  calcularSubtotal,
  pontosPorValorPago,
  validarCanalPedido,
  validarTransicao,
  RegraNegocioError,
} from './pedido-regras.js';

describe('regras de pedido', () => {
  it('exige canalPedido', () => {
    expect(() => validarCanalPedido(undefined)).toThrow(RegraNegocioError);
  });

  it('aceita canais válidos', () => {
    expect(validarCanalPedido('TOTEM')).toBe('TOTEM');
  });

  it('rejeita transição inválida', () => {
    expect(() => validarTransicao('ENTREGUE', 'CANCELADO')).toThrow(
      RegraNegocioError,
    );
  });

  it('permite cozinha avançar status', () => {
    expect(() => validarTransicao('RECEBIDO', 'EM_PREPARO')).not.toThrow();
  });

  it('calcula subtotal e desconto percentual', () => {
    const subtotal = calcularSubtotal([
      { quantidade: 2, precoUnitario: 10 },
      { quantidade: 1, precoUnitario: 5 },
    ]);
    expect(subtotal).toBe(25);
    expect(aplicarDescontoPercentual(25, 10)).toEqual({
      desconto: 2.5,
      totalFinal: 22.5,
    });
  });

  it('converte valor pago em pontos inteiros', () => {
    expect(pontosPorValorPago(39.9)).toBe(39);
  });
});
