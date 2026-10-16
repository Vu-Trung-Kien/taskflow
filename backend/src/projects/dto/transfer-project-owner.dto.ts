import { IsUUID } from 'class-validator';

export class TransferProjectOwnerDto {
  @IsUUID()
  userId!: string;
}
