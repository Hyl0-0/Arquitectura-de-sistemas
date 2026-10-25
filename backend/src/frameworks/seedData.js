import { Tenant } from '../domain/entities/Tenant.js';
import { User } from '../domain/entities/User.js';
import { Course } from '../domain/entities/Course.js';
import { Evaluation } from '../domain/entities/Evaluation.js';

export async function populateInitialData({ tenantRepo, userRepo, courseRepo }) {
  console.log('🌱 Inicializando datos base para Alumco y organizaciones multi-tenant...');

  // 1. Tenant Base: Alumco ONG
  const alumcoTenant = new Tenant({
    id: 'alumco',
    name: 'ONG Alumco',
    tagline: 'Capacitación, Seguridad y Desarrollo Comunitario en Aluminio y Reciclaje',
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
    sedes: ['Sede Central (Santiago)', 'Sede Norte (Antofagasta)', 'Sede Sur (Concepción)']
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

  // 4. Usuarios para Alumco (con los 4 roles del informe)
  const users = [
    new User({
      id: 'usr_admin',
      tenantId: 'alumco',
      name: 'Valentina Garrido',
      email: 'vgarrido@alumco.cl',
      role: User.ROLES.ADMIN,
      sede: 'Sede Central (Santiago)',
      cargo: 'Directora de Operaciones & RRHH'
    }),
    new User({
      id: 'usr_jefatura',
      tenantId: 'alumco',
      name: 'Carlos Mendoza',
      email: 'cmendoza@alumco.cl',
      role: User.ROLES.JEFATURA,
      sede: 'Sede Central (Santiago)',
      cargo: 'Jefe de Seguridad y Protocolos'
    }),
    new User({
      id: 'usr_profesor',
      tenantId: 'alumco',
      name: 'Prof. Andrea Soto',
      email: 'asoto@alumco.cl',
      role: User.ROLES.PROFESOR,
      sede: 'Sede Central (Santiago)',
      cargo: 'Coordinadora Académica & Revisor'
    }),
    new User({
      id: 'usr_profesor2',
      tenantId: 'alumco',
      name: 'Prof. Mauricio Morales',
      email: 'mmorales@alumco.cl',
      role: User.ROLES.PROFESOR,
      sede: 'Sede Norte (Antofagasta)',
      cargo: 'Especialista en Prevención de Riesgos'
    }),
    new User({
      id: 'usr_colaborador1',
      tenantId: 'alumco',
      name: 'Felipe Heredia',
      email: 'fheredia@alumco.cl',
      role: User.ROLES.COLABORADOR,
      sede: 'Sede Norte (Antofagasta)',
      cargo: 'Técnico de Fundición y Reciclaje'
    }),
    new User({
      id: 'usr_colaborador2',
      tenantId: 'alumco',
      name: 'Ignacio Llarlluri',
      email: 'illarlluri@alumco.cl',
      role: User.ROLES.COLABORADOR,
      sede: 'Sede Sur (Concepción)',
      cargo: 'Operario de Planta'
    }),
    new User({
      id: 'usr_colaborador3',
      tenantId: 'alumco',
      name: 'Javier Alcaino',
      email: 'jalcaino@alumco.cl',
      role: User.ROLES.COLABORADOR,
      sede: 'Sede Central (Santiago)',
      cargo: 'Ensamblador de Estructuras'
    })
  ];

  for (const u of users) {
    await userRepo.save(u);
  }

  // 5. Cursos para Alumco (1 Publicado y 1 Borrador para Human-in-the-Loop)
  const cursoPublicado = new Course({
    id: 'course_induccion_seguridad',
    tenantId: 'alumco',
    titulo: 'Inducción de Seguridad en Plantas de Aluminio y Trabajo en Altura',
    descripcion: 'Normativa obligatoria sobre uso de EPP, manejo de escoria a altas temperaturas y respuesta ante emergencias.',
    origen: 'MANUAL',
    estado: Course.STATUS.PUBLICADO,
    profesorRevisorId: 'usr_profesor',
    creadoPor: 'usr_jefatura',
    aprobadoAt: new Date().toISOString(),
    modulos: [
      {
        id: 'm1',
        orden: 1,
        titulo: 'Módulo 1: Elementos de Protección Personal (EPP)',
        contenido: 'Uso ininterrumpido de casco dieléctrico, visor térmico para fundición, polainas y guantes de carnaza. Todo elemento dañado debe sustituirse antes del inicio de turno.',
        tiempoEstimado: '10 min'
      },
      {
        id: 'm2',
        orden: 2,
        titulo: 'Módulo 2: Manejo de Metales y Prevención de Quemaduras',
        contenido: 'Protocolos de distancia segura para crisoles y cubas electrolíticas. Prohibición de presencia de humedad en moldes para evitar explosiones por vaporización súbita.',
        tiempoEstimado: '15 min'
      },
      {
        id: 'm3',
        orden: 3,
        titulo: 'Módulo 3: Plan de Evacuación y Primeros Auxilios',
        contenido: 'Zonas seguras de encuentro, uso de duchas de emergencia y activación de la sirena de evacuación ante fugas de gases o conatos de incendio.',
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
          enunciado: '¿Por qué está estrictamente prohibido introducir herramientas o moldes húmedos en el aluminio fundido?',
          opciones: [
            'Porque el agua altera el color del aluminio final',
            'Porque genera vaporización instantánea provocando una violenta explosión de metal',
            'Porque enfría demasiado rápido la cuba electrolítica',
            'No está prohibido siempre que se use mascarilla'
          ],
          respuestaCorrecta: 1
        },
        {
          id: 'q2',
          enunciado: '¿Cuál es el tiempo máximo de respuesta para acudir a la ducha de emergencia ante salpicadura química o térmica superficial?',
          opciones: [
            'Inmediato (menos de 10 segundos)',
            'Al terminar el turno de trabajo',
            'Después de avisar por escrito al supervisor',
            'Dentro de los primeros 30 minutos'
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
    id: 'course_protocolo_ambiental_ia',
    tenantId: 'alumco',
    titulo: '[BORRADOR IA] Protocolo Ambiental de Emisiones y Gestión de Residuos Sólidos',
    descripcion: 'Borrador generado por el Workflow secuencial de Claude a partir del documento oficial Protocolo_Ambiental_2026.pdf. Requiere revisión del profesor.',
    origen: 'IA_GENERADO',
    estado: Course.STATUS.BORRADOR,
    profesorRevisorId: 'usr_profesor',
    creadoPor: 'usr_jefatura',
    modulos: [
      {
        id: 'bm1',
        orden: 1,
        titulo: 'Módulo 1: Clasificación de Escorias y Residuos Peligrosos',
        contenido: 'Segregación en origen de residuos de alúmina, filtros de mangas y material refractario en tambores certificados.',
        tiempoEstimado: '15 min'
      },
      {
        id: 'bm2',
        orden: 2,
        titulo: 'Módulo 2: Monitoreo Continuo de Filtros de Aire',
        contenido: 'Verificación de manómetros de presión diferencial en los sistemas de captación de humos y partículas en suspensión.',
        tiempoEstimado: '20 min'
      }
    ],
    evaluacion: new Evaluation({
      id: 'eval_borrador_1',
      courseId: 'course_protocolo_ambiental_ia',
      puntajeAprobacion: 70,
      maxIntentos: 2,
      preguntas: [
        {
          id: 'bq1',
          enunciado: '¿Dónde deben depositarse las mangas filtrantes usadas con partículas de fundición?',
          opciones: [
            'En el contenedor municipal común',
            'En tambores estancos de residuos peligrosos con rotulación oficial',
            'En el patio trasero sin cubrir',
            'Se deben incinerar al aire libre'
          ],
          respuestaCorrecta: 1
        },
        {
          id: 'bq2',
          enunciado: '¿Qué indicador avisa sobre una eventual saturación o fuga en los filtros de mangas?',
          opciones: [
            'Variación anómala en el manómetro de presión diferencial',
            'El color del techo de la planta',
            'La temperatura ambiental externa',
            'Ninguno, se revisan cada 5 años'
          ],
          respuestaCorrecta: 0
        }
      ]
    })
  });
  await courseRepo.save(cursoBorrador);

  console.log('✅ Inicialización completa de Alumco y organizaciones demo.');
}
