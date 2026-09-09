import { Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { JwtStrategy } from './auth';

@Module({
  providers: [CommonService, JwtStrategy],
  exports: [CommonService, JwtStrategy],
})
export class CommonModule {}
