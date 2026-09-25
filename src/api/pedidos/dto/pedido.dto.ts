import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CANAIS_PEDIDO, STATUS_PEDIDO, type CanalPedido, type StatusPedido } from '../../../domain/enums.js';

export class ItemPedidoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  produtoId: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantidade: number;
}

export class CriarPedidoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  unidadeId: number;

  @ApiProperty({ enum: CANAIS_PEDIDO, example: 'TOTEM' })
  @IsEnum(CANAIS_PEDIDO)
  canalPedido: CanalPedido;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  clienteId?: number;

  @ApiProperty({ type: [ItemPedidoDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoDto)
  itens: ItemPedidoDto[];

  @ApiPropertyOptional({ example: 'NORDESTE10' })
  @IsOptional()
  @IsString()
  codigoPromocional?: string;
}

export class AtualizarStatusDto {
  @ApiProperty({ enum: STATUS_PEDIDO, example: 'EM_PREPARO' })
  @IsEnum(STATUS_PEDIDO)
  status: StatusPedido;
}
