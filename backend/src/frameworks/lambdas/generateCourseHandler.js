import { DynamoDbClientWrapper } from '../../adapters/DynamoDbAdapter.js';
import {
  DynamoDbCourseRepository,
  DynamoDbCircuitBreakerRepository
} from '../../adapters/DynamoDbRepositories.js';
import { BulkheadQueue, ClaudeAiService } from '../../adapters/ServicesAndCanary.js';
import { GenerateCourseFromPdfUseCase } from '../../usecases/AiAndCourseWorkflows.js';

const dbClient = new DynamoDbClientWrapper();
const courseRepo = new DynamoDbCourseRepository(dbClient);
const cbRepo = new DynamoDbCircuitBreakerRepository(dbClient);
const bulkheadQueue = new BulkheadQueue(2);
const claudeAi = new ClaudeAiService();

const generateCourseUseCase = new GenerateCourseFromPdfUseCase({
  courseRepository: courseRepo,
  aiService: claudeAi,
  circuitBreakerRepo: cbRepo,
  bulkheadQueue: bulkheadQueue
});

export const handler = async (event) => {
  console.log(`📥 Procesando ${event.Records?.length || 0} mensajes de SQS FIFO...`);

  const results = [];
  for (const record of (event.Records || [])) {
    try {
      const payload = JSON.parse(record.body || '{}');
      const res = await generateCourseUseCase.execute({
        tenantId: payload.tenantId || 'alumco',
        pdfFilename: payload.pdfFilename || 'Protocolo_Seguridad.pdf',
        pdfContentOrText: payload.pdfContentOrText || '',
        creadoPor: payload.creadoPor || 'usr_jefatura',
        profesorRevisorId: payload.profesorRevisorId || 'usr_profesor'
      });

      if (res.status === 'ERROR') {
        throw new Error(res.error || res.message || 'Fallo en la generación de curso con IA');
      }

      results.push(res);
    } catch (err) {
      console.error('Error procesando mensaje SQS:', err);
      throw err; // Permite redrive a la Dead Letter Queue (DLQ)
    }
  }

  return { status: 'SUCCESS', processedCount: results.length, results };
};
