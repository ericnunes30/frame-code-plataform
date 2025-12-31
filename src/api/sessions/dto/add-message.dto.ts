import { IsString } from 'class-validator';

export class AddMessageDto {
  @IsString()
  content!: string;
}
