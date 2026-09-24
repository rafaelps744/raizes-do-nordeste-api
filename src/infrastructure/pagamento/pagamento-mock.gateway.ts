import { Injectable } from '@nestjs/common';

export type ResultadoPagamentoMock = {
  aprovado: boolean;
  transacaoId: string;
  mensagem: string;
  processadoEm: string;
};

@Injectable()
export class PagamentoMockGateway {
  processar(input: {
    pedidoId: number;
    valor: number;
    forcarRecusa?: boolean;
  }): ResultadoPagamentoMock {
    const recusar = Boolean(input.forcarRecusa);
    return {
      aprovado: !recusar,
      transacaoId: `mock-${input.pedidoId}-${Date.now()}`,
      mensagem: recusar
        ? 'Pagamento recusado pelo gateway mock.'
        : 'Pagamento aprovado pelo gateway mock.',
      processadoEm: new Date().toISOString(),
    };
  }
}
