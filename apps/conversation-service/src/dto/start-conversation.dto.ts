import { IsUUID, IsString, MinLength } from 'class-validator';

export class StartConversationDto {
  @IsUUID()
  documentId!: string;

  @IsString()
  @MinLength(1)
  content!: string;
}