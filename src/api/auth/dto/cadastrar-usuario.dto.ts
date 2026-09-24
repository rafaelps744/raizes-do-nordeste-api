import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  MinLength,
} from 'class-validator';
import { PERFIS, type Perfil } from '../../../domain/enums.js';

export class CadastrarUsuarioDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsNotEmpty()
  nome: string;

  @ApiProperty({ example: 'maria@email.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '81999990000' })
  @IsOptional()
  telefone?: string;

  @ApiProperty({ example: 'Senha@123' })
  @MinLength(6)
  senha: string;

  @ApiPropertyOptional({ enum: PERFIS, default: 'CLIENTE' })
  @IsOptional()
  @IsEnum(PERFIS)
  perfil?: Perfil;

  @ApiPropertyOptional({
    description: 'Consentimento para o programa de fidelidade (LGPD)',
  })
  @IsOptional()
  @IsBoolean()
  consentimentoFidelidade?: boolean;
}
