import { KAFKA_SERVICE } from '@app/kafka';
import { ConflictException, Inject, Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { DatabaseService } from './database/database.service';
import { JwtService } from '@nestjs/jwt';
import { authUser } from './database';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { KAFKA_TOPICS } from '@app/kafka/constants/kafka.constants';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(KAFKA_SERVICE) private readonly kafkaClient: ClientKafka,
    private readonly dbService: DatabaseService,
    private readonly jwtService: JwtService
  ) {}

  async onModuleInit() {
    await this.kafkaClient.connect();
    this.logger.log('Kafka Connected Successfully');
  }

  async register(email: string, password: string) {
    const existingUser = await this.dbService.db
      .select()
      .from(authUser)
      .where(eq(authUser.email, email))
      .limit(1);
    
    if(existingUser.length > 0){
      throw new ConflictException('User already exists!');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [user] = await this.dbService.db
      .insert(authUser)
      .values({ email, password: hashedPassword })
      .returning();

    this.kafkaClient.emit(KAFKA_TOPICS.USER_REGISTERED, {
      userId: user.id,
      email: user.email,
      password: user.password,
      timestamp: new Date().toISOString(),
    });

    return { message: 'User registered successfully', userId: user.id };
  }

  async login(email: string, password: string) {
    const [user] = await this.dbService.db
      .select()
      .from(authUser)
      .where(eq(authUser.email, email))
      .limit(1);
    
    if(!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({ sub: user.id, email: user.email });

    this.kafkaClient.emit(KAFKA_TOPICS.USER_LOGGED_IN,{
      userId: user.id,
      timestamp: new Date().toISOString()
    });

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  getHello(): string {
    return 'Hello World!';
  }
}
