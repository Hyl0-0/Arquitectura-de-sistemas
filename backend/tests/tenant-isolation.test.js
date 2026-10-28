// Pruebas de aislamiento entre clientes (multi-tenant): lo que guarda una organización
// no debe verse ni mezclarse con lo de otra. Usan la base en memoria que imita a DynamoDB.
// Se ejecutan con: npm test (dentro de la carpeta backend)
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { DynamoDbClientWrapper } from '../src/adapters/DynamoDbAdapter.js';
import {
  DynamoDbTenantRepository,
  DynamoDbCourseRepository,
  DynamoDbUserRepository,
  DynamoDbAttemptRepository,
  DynamoDbCertificateRepository
} from '../src/adapters/DynamoDbRepositories.js';
import { Tenant } from '../src/domain/entities/Tenant.js';
import { Course } from '../src/domain/entities/Course.js';
import { User } from '../src/domain/entities/User.js';
import { Attempt, Certificate } from '../src/domain/entities/ResilienceAndAssessments.js';

// Forzamos el modo en memoria, aunque el computador tenga credenciales de AWS
delete process.env.AWS_ACCESS_KEY_ID;
delete process.env.AWS_SECRET_ACCESS_KEY;

// Cada prueba parte con una base vacía y repositorios nuevos
function crearRepos() {
  const db = new DynamoDbClientWrapper();
  return {
    tenants: new DynamoDbTenantRepository(db),
    courses: new DynamoDbCourseRepository(db),
    users: new DynamoDbUserRepository(db),
    attempts: new DynamoDbAttemptRepository(db),
    certs: new DynamoDbCertificateRepository(db)
  };
}

const crearCurso = (tenantId, id, titulo) => new Course({ id, tenantId, titulo });
const crearUsuario = (tenantId, id, email) => new User({ id, tenantId, name: id, email });

describe('Aislamiento entre clientes', () => {
  test('un curso de un cliente no aparece en el listado de otro', async () => {
    const { courses } = crearRepos();
    await courses.save(crearCurso('alumco', 'c1', 'Curso de Alumco'));

    const deAlumco = await courses.listByTenant('alumco');
    const deClinica = await courses.listByTenant('clinica');

    assert.equal(deAlumco.length, 1);
    assert.equal(deClinica.length, 0);
  });

  test('pedir por id un curso de otro cliente devuelve null', async () => {
    const { courses } = crearRepos();
    await courses.save(crearCurso('alumco', 'c1', 'Curso de Alumco'));

    assert.equal(await courses.getById('clinica', 'c1'), null);
  });

  test('dos clientes pueden usar el mismo id de curso sin pisarse', async () => {
    const { courses } = crearRepos();
    await courses.save(crearCurso('alumco', 'c1', 'Curso de Alumco'));
    await courses.save(crearCurso('clinica', 'c1', 'Curso de la Clínica'));

    assert.equal((await courses.getById('alumco', 'c1')).titulo, 'Curso de Alumco');
    assert.equal((await courses.getById('clinica', 'c1')).titulo, 'Curso de la Clínica');
  });

  test('los usuarios de un cliente no se listan en otro', async () => {
    const { users } = crearRepos();
    await users.save(crearUsuario('alumco', 'u1', 'u1@alumco.cl'));
    await users.save(crearUsuario('clinica', 'u2', 'u2@clinica.cl'));

    const deAlumco = await users.listByTenantAndSede('alumco');
    assert.deepEqual(deAlumco.map(u => u.id), ['u1']);
    assert.equal(await users.getById('clinica', 'u1'), null);
  });

  test('los certificados de un cliente no se ven desde otro', async () => {
    const { certs } = crearRepos();
    await certs.save(new Certificate({
      id: 'cert1', tenantId: 'alumco', userId: 'u1', userName: 'Ana',
      courseId: 'c1', courseTitle: 'Curso', attemptId: 'a1', puntaje: 100,
      codigoVerificacion: 'CERT-ALUM-ABC123'
    }));

    assert.equal((await certs.getByUserId('alumco', 'u1')).length, 1);
    assert.equal((await certs.getByUserId('clinica', 'u1')).length, 0);
  });

  test('el reporte de intentos solo incluye los de su propio cliente', async () => {
    const { attempts } = crearRepos();
    await attempts.save(new Attempt({
      id: 'a1', tenantId: 'alumco', userId: 'u1', courseId: 'c1', intentoNro: 1
    }));
    await attempts.save(new Attempt({
      id: 'a2', tenantId: 'clinica', userId: 'u2', courseId: 'c2', intentoNro: 1
    }));

    const deAlumco = await attempts.listAllAttempts('alumco');
    assert.deepEqual(deAlumco.map(a => a.userId), ['u1']);
  });

  test('cada cliente conserva su propio tema visual', async () => {
    const { tenants } = crearRepos();
    await tenants.save(new Tenant({ id: 'alumco', name: 'Alumco', colors: { primary: '#1e3a8a' } }));
    await tenants.save(new Tenant({ id: 'clinica', name: 'Clínica Salud Austral', colors: { primary: '#15803d' } }));

    assert.equal((await tenants.getById('alumco')).colors.primary, '#1e3a8a');
    assert.equal((await tenants.getById('clinica')).colors.primary, '#15803d');
    assert.equal(await tenants.getById('otro'), null);
  });
});
