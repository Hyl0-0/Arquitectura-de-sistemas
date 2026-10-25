import { DynamoDbClientWrapper } from '../../adapters/DynamoDbAdapter.js';
import {
  DynamoDbCourseRepository,
  DynamoDbUserRepository,
  DynamoDbAttemptRepository,
  DynamoDbCertificateRepository
} from '../../adapters/DynamoDbRepositories.js';
import { SesNotificationService } from '../../adapters/ServicesAndCanary.js';
import { SubmitEvaluationUseCase } from '../../usecases/SubmitEvaluationUseCase.js';

// Instancias compartidas para reutilización de conexión en Lambda (Cold start optimization)
const dbClient = new DynamoDbClientWrapper();
const courseRepo = new DynamoDbCourseRepository(dbClient);
const userRepo = new DynamoDbUserRepository(dbClient);
const attemptRepo = new DynamoDbAttemptRepository(dbClient);
const certRepo = new DynamoDbCertificateRepository(dbClient);
const sesNotification = new SesNotificationService({ maxRetries: 3, baseDelayMs: 150 });

const submitEvaluationUseCase = new SubmitEvaluationUseCase({
  attemptRepository: attemptRepo,
  courseRepository: courseRepo,
  certificateRepository: certRepo,
  notificationService: sesNotification,
  userRepository: userRepo
});

export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-tenant-id',
    'Access-Control-Allow-Methods': 'OPTIONS,POST'
  };

  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 204, headers, body: '' };
    }

    const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
    const tenantId = event.headers?.['x-tenant-id'] || body.tenantId || 'alumco';

    const result = await submitEvaluationUseCase.execute({
      tenantId,
      userId: body.userId,
      courseId: body.courseId,
      respuestas: body.respuestas || {}
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Error en submitEvaluationHandler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Error interno en Lambda' })
    };
  }
};
