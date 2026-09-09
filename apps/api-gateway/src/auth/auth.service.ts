import { SERVICES_PORTS } from '@app/common/constants';
import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  private readonly authServiceUrl = `http://localhost:${SERVICES_PORTS.AUTH_SERVICE}/v1`;

  constructor(private readonly httpService: HttpService) {}

  async register(data: {
    email: string, 
    password: string
  }) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authServiceUrl}/auth/register`,
          data
        )
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async login(data: {
    email: string, 
    password: string
  }) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.authServiceUrl}/auth/login`,
          data
        )
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
