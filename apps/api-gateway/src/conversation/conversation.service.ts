import { SERVICES_PORTS } from '@app/common/constants';
import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { CreateMessageDto } from 'apps/conversation-service/src/dto/create-message.dto';
import { StartConversationDto } from 'apps/conversation-service/src/dto/start-conversation.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ConversationService {
  private readonly conversationServiceUrl = `http://localhost:${SERVICES_PORTS.CONVERSATION_SERVICE}/v1/conversation`

  constructor(
    private readonly httpService: HttpService
  ) {}

  async getConversation(userId: string, conversationId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.conversationServiceUrl}/${conversationId}`, {
          headers: {
            'x-user-id': userId,
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getAllConversation(userId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.conversationServiceUrl}`, {
          headers: {
            'x-user-id': userId,
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async startConversation(userId: string, dto: StartConversationDto) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.conversationServiceUrl}`,
          dto,
          {
            headers: { 'x-user-id': userId }
          }
        ),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async sendMessage(userId: string, conversationId: string, dto: CreateMessageDto) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.conversationServiceUrl}/${conversationId}`,
          dto,
          { headers: { 'x-user-id': userId } },
        ),
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    const err = error as { response?: { data: string | object; status: number } };
    if (err.response) {
      throw new HttpException(err.response.data, err.response.status);
    }
    throw new HttpException('Something went wrong', 503);
  }
}
