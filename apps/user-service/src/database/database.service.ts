import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool!: Pool;
  public db!: NodePgDatabase<typeof schema>;
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    private readonly configService: ConfigService
  ) { }

  async onModuleInit() {
    try {
      const connectionString = this.configService.getOrThrow<string>('USER_SERVICE_DATABASE_URL'); 
      
      this.pool = new Pool({ connectionString });
      this.db = drizzle(this.pool, { schema });

      await this.pool.query('SELECT 1');
      this.logger.log('Postgres Database Connected Successfully!')
    } catch (error: any) {
      this.logger.error('Faile to connect to Postgres', error.message);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  get schema() {
    return schema;
  }
}
