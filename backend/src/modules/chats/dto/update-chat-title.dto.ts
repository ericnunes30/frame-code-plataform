import { IsString, MaxLength } from 'class-validator';

export class UpdateChatTitleDto {
  @IsString()
  @MaxLength(200)
  title!: string;
}
