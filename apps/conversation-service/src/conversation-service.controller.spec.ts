import { Test, TestingModule } from '@nestjs/testing';
import { ConversationServiceController } from './conversation-service.controller';
import { ConversationServiceService } from './conversation-service.service';

describe('ConversationServiceController', () => {
  let conversationServiceController: ConversationServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ConversationServiceController],
      providers: [ConversationServiceService],
    }).compile();

    conversationServiceController = app.get<ConversationServiceController>(ConversationServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(conversationServiceController.getHello()).toBe('Hello World!');
    });
  });
});
