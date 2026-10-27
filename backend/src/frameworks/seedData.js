import { Tenant } from '../domain/entities/Tenant.js';
import { User } from '../domain/entities/User.js';
import { Course } from '../domain/entities/Course.js';
import { Evaluation } from '../domain/entities/Evaluation.js';

export async function populateInitialData({ tenantRepo, userRepo, courseRepo }) {
  // Evitar sobreescritura si los datos ya fueron poblados en DynamoDB
  const existingTenant = await tenantRepo.getById('alumco');
  if (existingTenant) {
    console.log('ℹ️ Base de datos ya inicializada previamente. Omitiendo siembra de datos.');
    return;
  }

  console.log('🌱 Inicializando datos base para Alumco y organizaciones multi-tenant...');

  // 1. Tenant Base: Alumco ONG
  const alumcoTenant = new Tenant({
    id: 'alumco',
    name: 'ONG Alumco',
    tagline: 'Capacitación y Cumplimiento para el Cuidado de Personas Mayores (ELEAM)',
    logoUrl: '/logo-alumco.png',
    colors: {
      primary: '#1e3a8a',       // Azul Alumco corporativo
      primaryHover: '#1d4ed8',
      secondary: '#0284c7',
      accent: '#f59e0b',
      background: '#090d16',
      surface: '#111827',
      text: '#f8fafc',
      muted: '#94a3b8'
    },
    sedes: ['ELEAM Hualpén (Biobío)', 'ELEAM Coyhaique (Aysén)']
  });
  await tenantRepo.save(alumcoTenant);

  // 2. Tenant Secundario de demostración: Clínica Salud Austral
  const clinicaTenant = new Tenant({
    id: 'clinica_austral',
    name: 'Clínica Salud Austral',
    tagline: 'Acreditación y Bioseguridad Hospitalaria',
    logoUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=128&auto=format&fit=crop&q=80',
    colors: {
      primary: '#059669',       // Verde hospitalario
      primaryHover: '#047857',
      secondary: '#0d9488',
      accent: '#10b981',
      background: '#06130f',
      surface: '#0d221c',
      text: '#ecfdf5',
      muted: '#6ee7b7'
    },
    sedes: ['Pabellón Central', 'Urgencias Temuco', 'Sede Valdivia']
  });
  await tenantRepo.save(clinicaTenant);

  // 3. Tenant 3: Constructora Vial Andina
  const vialTenant = new Tenant({
    id: 'vial_andina',
    name: 'Constructora Vial Andina',
    tagline: 'Seguridad en Faenas de Alta Montaña y Maquinaria Pesada',
    logoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f9?w=128&auto=format&fit=crop&q=80',
    colors: {
      primary: '#c2410c',       // Naranja industrial
      primaryHover: '#9a3412',
      secondary: '#ea580c',
      accent: '#f97316',
      background: '#150a04',
      surface: '#261206',
      text: '#fff7ed',
      muted: '#fdba74'
    },
    sedes: ['Faena Cordillera', 'Planta Norte', 'Taller Maquinaria']
  });
  await tenantRepo.save(vialTenant);

  // 4. Usuarios para Alumco (4 roles; puede haber varios usuarios por rol)
  const users = [
    new User({
      id: 'usr_direccion',
      tenantId: 'alumco',
      name: 'Valentina Garrido',
      email: 'vgarrido@alumco.cl',
      role: User.ROLES.JEFATURA,
      sede: 'ELEAM Hualpén (Biobío)',
      cargo: 'Representante Legal & Directora Ejecutiva'
    }),
    new User({
      id: 'usr_admin',
      tenantId: 'alumco',
      name: 'Rodrigo Fuentes',
      email: 'rfuentes@alumco.cl',
      role: User.ROLES.ADMIN,
      sede: 'ELEAM Hualpén (Biobío)',
      cargo: 'Encargado de Sistemas (TI) & DevOps'
    }),
    new User({
      id: 'usr_jefatura',
      tenantId: 'alumco',
      name: 'Carlos Mendoza',
      email: 'cmendoza@alumco.cl',
      role: User.ROLES.JEFATURA,
      sede: 'ELEAM Hualpén (Biobío)',
      cargo: 'Jefe de Protocolos y Cumplimiento SENAMA'
    }),
    new User({
      id: 'usr_profesor',
      tenantId: 'alumco',
      name: 'Prof. Andrea Soto',
      email: 'asoto@alumco.cl',
      role: User.ROLES.PROFESOR,
      sede: 'ELEAM Hualpén (Biobío)',
      cargo: 'Coordinadora Académica & Revisora'
    }),
    new User({
      id: 'usr_profesor2',
      tenantId: 'alumco',
      name: 'Prof. Mauricio Morales',
      email: 'mmorales@alumco.cl',
      role: User.ROLES.PROFESOR,
      sede: 'ELEAM Coyhaique (Aysén)',
      cargo: 'Enfermero Supervisor & Revisor'
    }),
    new User({
      id: 'usr_colaborador1',
      tenantId: 'alumco',
      name: 'Felipe Heredia',
      email: 'fheredia@alumco.cl',
      role: User.ROLES.COLABORADOR,
      sede: 'ELEAM Coyhaique (Aysén)',
      cargo: 'Técnico en Enfermería (TENS)'
    }),
    new User({
      id: 'usr_colaborador2',
      tenantId: 'alumco',
      name: 'Ignacio Llarlluri',
      email: 'illarlluri@alumco.cl',
      role: User.ROLES.COLABORADOR,
      sede: 'ELEAM Hualpén (Biobío)',
      cargo: 'Cuidador de Personas Mayores'
    }),
    new User({
      id: 'usr_colaborador3',
      tenantId: 'alumco',
      name: 'Javier Alcaino',
      email: 'jalcaino@alumco.cl',
      role: User.ROLES.COLABORADOR,
      sede: 'ELEAM Coyhaique (Aysén)',
      cargo: 'Auxiliar de Servicio'
    })
  ];

  for (const u of users) {
    await userRepo.save(u);
  }

  // 5. Cursos para Alumco (1 Publicado y 1 Borrador para Human-in-the-Loop)
  const cursoPublicado = new Course({
    id: 'course_induccion_seguridad',
    tenantId: 'alumco',
    titulo: 'Inducción en Cuidado Seguro de Personas Mayores (Protocolos SENAMA)',
    descripcion: 'Capacitación obligatoria para el personal de los ELEAM sobre buen trato, prevención de caídas y respuesta ante emergencias.',
    origen: 'MANUAL',
    estado: Course.STATUS.PUBLICADO,
    profesorRevisorId: 'usr_profesor',
    creadoPor: 'usr_jefatura',
    aprobadoAt: new Date().toISOString(),
    modulos: [
      {
        id: 'm1',
        orden: 1,
        titulo: 'Módulo 1: Buen Trato y Derechos de la Persona Mayor',
        contenido: 'Principios de trato digno, respeto a la autonomía y privacidad del residente, y detección y notificación de cualquier situación de maltrato.',
        tiempoEstimado: '10 min'
      },
      {
        id: 'm2',
        orden: 2,
        titulo: 'Módulo 2: Prevención de Caídas y Movilización Segura',
        contenido: 'Evaluación del riesgo de caída, uso correcto de sillas de ruedas y andadores, y técnicas de traslado cama-silla que protegen al residente y al cuidador.',
        tiempoEstimado: '15 min'
      },
      {
        id: 'm3',
        orden: 3,
        titulo: 'Módulo 3: Emergencias y Plan de Evacuación del ELEAM',
        contenido: 'Zonas de seguridad, evacuación de residentes con movilidad reducida, primeros auxilios básicos y activación de la cadena de aviso ante incendios o sismos.',
        tiempoEstimado: '12 min'
      }
    ],
    evaluacion: new Evaluation({
      id: 'eval_induccion_1',
      courseId: 'course_induccion_seguridad',
      puntajeAprobacion: 70,
      maxIntentos: 2,
      preguntas: [
        {
          id: 'q1',
          enunciado: '¿Qué se debe hacer antes de trasladar a un residente con movilidad reducida desde la cama a la silla de ruedas?',
          opciones: [
            'Levantarlo rápido para no perder tiempo',
            'Frenar la silla, explicarle la maniobra al residente y usar una técnica de movilización segura',
            'Esperar a que el residente se traslade solo',
            'Trasladarlo solo si lo pide un familiar'
          ],
          respuestaCorrecta: 1
        },
        {
          id: 'q2',
          enunciado: 'Si un residente sufre una caída, ¿cuál es la primera acción correcta?',
          opciones: [
            'No moverlo, evaluar su estado y avisar de inmediato al profesional de salud de turno',
            'Levantarlo de inmediato y sentarlo en una silla',
            'Registrar la caída al final del turno',
            'Esperar a que se levante por sí mismo'
          ],
          respuestaCorrecta: 0
        },
        {
          id: 'q3',
          enunciado: '¿Cuál es la nota mínima porcentual exigida por la ONG Alumco para certificar la inducción?',
          opciones: [
            '50%',
            '60%',
            '70%',
            '85%'
          ],
          respuestaCorrecta: 2
        },
        {
          id: 'q4',
          enunciado: 'Si un colaborador no logra aprobar en su primer intento, ¿cuántos intentos adicionales le otorga la plataforma?',
          opciones: [
            'Ninguno, queda suspendido inmediatamente',
            '1 intento adicional (2 intentos máximos en total)',
            '3 intentos adicionales',
            'Intentos ilimitados'
          ],
          respuestaCorrecta: 1
        }
      ]
    })
  });
  await courseRepo.save(cursoPublicado);

  // Curso Borrador generado por IA esperando revisión humana (Human-in-the-Loop)
  const cursoBorrador = new Course({
    id: 'course_protocolo_medicamentos_ia',
    tenantId: 'alumco',
    titulo: '[BORRADOR IA] Protocolo de Administración Segura de Medicamentos',
    descripcion: 'Borrador generado por el Workflow secuencial de Claude a partir del documento oficial Protocolo_Medicamentos_2026.pdf. Requiere revisión del profesor.',
    origen: 'IA_GENERADO',
    estado: Course.STATUS.BORRADOR,
    profesorRevisorId: 'usr_profesor',
    creadoPor: 'usr_jefatura',
    modulos: [
      {
        id: 'bm1',
        orden: 1,
        titulo: 'Módulo 1: Los 5 Correctos en la Administración de Medicamentos',
        contenido: 'Verificación de residente, medicamento, dosis, vía y horario correctos antes de cada administración.',
        tiempoEstimado: '15 min'
      },
      {
        id: 'bm2',
        orden: 2,
        titulo: 'Módulo 2: Registro y Almacenamiento de Medicamentos',
        contenido: 'Registro en la ficha clínica de cada dosis administrada y almacenamiento seguro, rotulado y bajo llave de los medicamentos.',
        tiempoEstimado: '20 min'
      }
    ],
    evaluacion: new Evaluation({
      id: 'eval_borrador_1',
      courseId: 'course_protocolo_medicamentos_ia',
      puntajeAprobacion: 70,
      maxIntentos: 2,
      preguntas: [
        {
          id: 'bq1',
          enunciado: '¿Qué debe verificarse antes de administrar un medicamento a un residente?',
          opciones: [
            'Solo el nombre del medicamento',
            'Los 5 correctos: residente, medicamento, dosis, vía y horario',
            'Que el residente no esté durmiendo',
            'Nada, basta con que esté en la receta'
          ],
          respuestaCorrecta: 1
        },
        {
          id: 'bq2',
          enunciado: '¿Dónde debe registrarse cada medicamento administrado?',
          opciones: [
            'En la ficha clínica del residente, con hora y firma de quien lo administró',
            'En una hoja suelta en la sala de enfermería',
            'No es necesario registrarlo',
            'En el celular personal del cuidador'
          ],
          respuestaCorrecta: 0
        }
      ]
    })
  });
  await courseRepo.save(cursoBorrador);

  console.log('✅ Inicialización completa de Alumco y organizaciones demo.');
}
