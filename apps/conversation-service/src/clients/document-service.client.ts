import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { SERVICES_PORTS } from '@app/common/constants';

export interface DocumentResponse {
  id: string;
  userId: string;
  fileName: string;
  status: string;
  failureReason: string | null;
}

@Injectable()
export class DocumentServiceClient {
  private readonly logger = new Logger(DocumentServiceClient.name);
  private readonly baseUrl = `http://localhost:${SERVICES_PORTS.DOCUMENT_SERVICE}/v1/document`;

  constructor(private readonly httpService: HttpService) {}

  async getDocumentById(documentId: string, userId: string): Promise<DocumentResponse | null> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<DocumentResponse>(
          `${this.baseUrl}/${documentId}`,
          {
            headers: { 'x-user-id': userId },
          }
        ),
      );
      return data;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        return null;
      }
      this.logger.error(`Failed to fetch document ${documentId}`, axiosError.stack);
      throw error;
    }
  }
}