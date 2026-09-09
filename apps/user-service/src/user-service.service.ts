import { 
  Inject, 
  Injectable, 
  InternalServerErrorException, 
  Logger, 
  NotFoundException, 
  OnModuleInit } from '@nestjs/common';
import { DatabaseService } from './database/database.service';
import { KAFKA_SERVICE } from '@app/kafka';
import { ClientKafka } from '@nestjs/microservices';
import { UserRegisteredPayload } from './interface/user-registered-payload.interface';
import { users } from './database/schema';
import { eq } from 'drizzle-orm';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService implements OnModuleInit {
  private readonly logger = new Logger(UserService.name);
  
  constructor(
    @Inject(KAFKA_SERVICE) private readonly kafkaClient: ClientKafka,
    private readonly dbService: DatabaseService
  ) {}
  
  async onModuleInit() {
    await this.kafkaClient.connect();
    this.logger.log(`KAFKA CONNECTED SUCCESSFULLY`);
  }

  async initializeUser(payload: UserRegisteredPayload) {
    const { userId, email, password } = payload.data;

    this.logger.log(`INITIALIZING USER PROFILE FOR ID: ${userId}`);
    
    try {
      const [insertedUser] = await this.dbService.db
        .insert(users)
        .values({
          id: userId,
          email: email,
          password: password,
          firstName: null,
          lastName: null,
        })
        .onConflictDoNothing()
        .returning();
      
      if(!insertedUser) {
        this.logger.warn(`User with ID ${userId} already exists. Skipping initialization.`)
        return { message: 'User Already Exists', userId };
      }

      // TODO/LATER Kafka Emit for USER CREATED for Stats Service
      return {
        message: 'User Initialized',
        userId
      } 
    } catch (error: any) {
      this.logger.error(`Failed to initialize user for ID: ${userId}. Error: ${error.message}`, error.stack,);
      throw error;
    }
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    try {
      const [updatedUser] = await this.dbService.db
        .update(users)
        .set({
          ...dto,
          updatedAt: new Date(), 
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        }); 

      if (!updatedUser) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      return updatedUser;
    } catch (error) {
      if(error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to update user profile');
    }
  }

  async getUser(userId: string) {
    const [user] = await this.dbService.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if(!user) {
      throw new NotFoundException('User data not found')
    }

    return user;
  }
}
