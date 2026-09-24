import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Perfil } from '../../domain/enums.js';
import { PERFIS_KEY } from './auth.decorators.js';
import type { JwtPayload } from './jwt-payload.js';

@Injectable()
export class PerfisGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Perfil[]>(PERFIS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;
    if (!user || !required.includes(user.perfil as Perfil)) {
      throw new ForbiddenException(
        'Seu perfil não possui permissão para esta ação.',
      );
    }
    return true;
  }
}
