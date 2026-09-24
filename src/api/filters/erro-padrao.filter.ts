import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { RegraNegocioError } from '../../domain/pedido-regras.js';

export type ErroPadrao = {
  error: string;
  message: string;
  details: Array<{ field: string; issue: string }>;
  timestamp: string;
  path: string;
  requestId?: string;
};

@Catch()
export class ErroPadraoFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const body = this.montarErro(exception, request.url);
    response.status(body.status).json(body.payload);
  }

  private montarErro(
    exception: unknown,
    path: string,
  ): { status: number; payload: ErroPadrao } {
    const timestamp = new Date().toISOString();

    if (exception instanceof RegraNegocioError) {
      return {
        status: exception.httpStatus,
        payload: {
          error: exception.code,
          message: exception.message,
          details: exception.details,
          timestamp,
          path,
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      let message = exception.message;
      let error = exception.name.replace('Exception', '').toUpperCase() || 'HTTP_ERROR';
      let details: Array<{ field: string; issue: string }> = [];

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res) {
        const obj = res as Record<string, unknown>;
        if (typeof obj.message === 'string') message = obj.message;
        if (Array.isArray(obj.message)) {
          details = (obj.message as string[]).map((issue) => ({
            field: 'body',
            issue,
          }));
          message = 'Dados de entrada inválidos.';
          error = 'VALIDACAO';
        }
        if (typeof obj.error === 'string') error = obj.error.toUpperCase().replaceAll(' ', '_');
      }

      if (status === 401) error = error === 'UNAUTHORIZED' ? 'NAO_AUTENTICADO' : error;
      if (status === 403) error = 'SEM_PERMISSAO';
      if (status === 404) error = error.includes('NOT') ? 'NAO_ENCONTRADO' : error;

      return {
        status,
        payload: { error, message, details, timestamp, path },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      payload: {
        error: 'ERRO_INTERNO',
        message: 'Ocorreu um erro inesperado.',
        details: [],
        timestamp,
        path,
      },
    };
  }
}
