import { KAFKA_SERVICE } from '@app/kafka';
import { ConflictException, Inject, Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { DatabaseService } from './database/database.service';
import { JwtService } from '@nestjs/jwt';
import { authUser } from './database';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { KAFKA_TOPICS } from '@app/kafka/constants/kafka.constants';
import { UserRegisteredEvent } from './interface/register.interface';
import { randomUUID } from 'crypto';
import { UserLoggedInEvent } from './interface/login.interface';

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

    const registeredEvent: UserRegisteredEvent = {
      eventId: randomUUID(),
      eventType: KAFKA_TOPICS.USER_REGISTERED,
      timestamp: new Date().toISOString(),
      version: 1,
      data: {
        userId: user.id,
        email: user.email,
        password: user.password,
        registeredAt: new Date().toISOString(),
      }
    }

    this.kafkaClient.emit(KAFKA_TOPICS.USER_REGISTERED, registeredEvent);

    this.logger.log(`USER REGISTERED MESSAGE EMITTED TO ${KAFKA_TOPICS.USER_REGISTERED}`)

    this.logger.log(`USER CREATED SUCCESSFULLY, ${user}`);
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

    const loggedInEvent: UserLoggedInEvent = {
      eventId: randomUUID(),
      eventType: KAFKA_TOPICS.USER_REGISTERED,
      timestamp: new Date().toISOString(),
      version: 1,
      data: {
        userId: user.id,
      }
    }

    this.kafkaClient.emit(KAFKA_TOPICS.USER_LOGGED_IN, loggedInEvent);

    this.logger.log(`USER LOGGED IN MESSAGE EMITTED TO ${KAFKA_TOPICS.USER_LOGGED_IN}`)

    this.logger.log(`USER LOGGED IN SUCCESSFULLY`);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }
}
