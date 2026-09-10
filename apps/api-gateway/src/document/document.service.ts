import { SERVICES_PORTS } from '@app/common/constants';
import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import FormData from 'form-data'; 
import { firstValueFrom } from 'rxjs';
import { Readable } from 'stream';

@Injectable()
export class DocumentService {
  private readonly documentServiceUrl = `http://localhost:${SERVICES_PORTS.DOCUMENT_SERVICE}/v1/document`
  constructor(
    private readonly httpService: HttpService
  ) { }

  async uploadDocument(userId: string, file: Express.Multer.File) {
    try {
      const formData = new FormData();

      formData.append('file', Readable.from(file.buffer), {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.documentServiceUrl}/upload`,
          formData,
          {
            headers: { 'x-user-id': userId }
          }
        )
      )

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async getDocument(userId: string, documentId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.documentServiceUrl}/${documentId}`, {
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

  async getAllDocument(userId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.documentServiceUrl}/`, {
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

  private handleError(error: unknown): never {
    const err = error as {
      response?: { data: string | object; status: number };
    };

    if (err.response) {
      throw new HttpException(err.response.data, err.response.status);
    }

    throw new HttpException('Something went wrong', 503);
  }
}
