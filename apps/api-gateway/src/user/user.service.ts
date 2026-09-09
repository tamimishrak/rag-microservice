import { SERVICES_PORTS } from '@app/common/constants';
import { HttpService } from '@nestjs/axios';
import { HttpException, Injectable } from '@nestjs/common';
import { UpdateUserDto } from 'apps/user-service/src/dto/update-user.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class UserService {
  private readonly userServiceUrl = `http://localhost:${SERVICES_PORTS.USER_SERVICE}/v1/user`;
  
  constructor(
    private readonly httpService: HttpService
  ) {}

  async getUser(userId: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.userServiceUrl}/profile`,
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

  async updateUser(
    data: UpdateUserDto,
    userId: string
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.userServiceUrl}/profile`,
          data,
          {
            headers: { 'x-user-id': userId }
          }
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
