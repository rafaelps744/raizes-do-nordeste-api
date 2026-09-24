import { SetMetadata } from '@nestjs/common';
import type { Perfil } from '../../domain/enums.js';

export const PERFIS_KEY = 'perfis';
export const Perfis = (...perfis: Perfil[]) => SetMetadata(PERFIS_KEY, perfis);
export const Publico = () => SetMetadata('isPublic', true);
