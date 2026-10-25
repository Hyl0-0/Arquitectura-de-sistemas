# Plataforma Serverless de Capacitación y Cumplimiento Multi-Organización (Base Alumco)

Aplicación serverless de inducción, capacitación y certificación basada íntegramente en la arquitectura de nube del **Certamen de Arquitectura de Sistemas**. Implementa **Clean Architecture**, base de datos NoSQL **Amazon DynamoDB**, patrones de resiliencia en la nube (**Circuit Breaker**, **Bulkhead**, **Retry con Backoff Exponencial**), flujo **Human-in-the-Loop (IA + Revisión Docente)**, soporte **Multi-Organización (White-label Theming)**, selector de **Modo Claro / Modo Oscuro** y control de **Despliegues Canarios (AWS SAM Canary Releases)**.

---

## 🌟 Características y Patrones de Arquitectura

### 1. Alineación 100% con Servicios de AWS
* **Amazon DynamoDB:** Base de datos NoSQL con particionado multi-tenant (`PK`, `SK`), escalado bajo demanda (`PAY_PER_REQUEST`) y point-in-time recovery.
* **AWS Lambda (Node.js 22):** Funciones desacopladas por caso de uso (`AlumcoApiFunction`, `SubmitEvaluationFunction`, `GenerateCourseAiFunction`).
* **Amazon API Gateway:** Entrada HTTPS unificada con soporte de etapas de producción, proxy serverless y enrutamiento canario.
* **Amazon SQS (FIFO):** Cola secuencial con Dead Letter Queue (DLQ) para procesamiento asíncrono y control de concurrencia.
* **Amazon SES:** Notificaciones y escalamiento administrativo con patrón **Retry** de 3 intentos y backoff exponencial ante evaluaciones reprobadas.
* **Amazon CloudWatch:** Alarmas métricas de tasa de error configuradas para disparar *rollback* automático durante despliegues canarios.
* **Amazon S3:** Almacenamiento seguro de protocolos PDF y emisión de certificados digitales.

### 2. Soporte Multi-Organización (White-Label Theming)
Permite adaptar en caliente la identidad visual y temática de la plataforma sin recompilar el código:
* **ONG Alumco** (Azul institucional y logo corporativo oficial).
* **Clínica Salud Austral** (Verde bioseguridad).
* **Constructora Vial Andina** (Naranja industrial).
* **Editor en Vivo (`🎨 Theming`):** Permite personalizar colores primarios, secundarios, de acento, nombres y logos, persistiendo los cambios en DynamoDB.
* **Modo Claro / Modo Oscuro (`☀️ / 🌙`):** Conmutador accesible con persistencia en `localStorage` y adaptación de contraste accesible (WCAG AAA).

### 3. Roles y Flujos de Negocio
* **👷 Colaborador (Alumno):**
  * Lectura de módulos de capacitación interactivos.
  * Rendición de evaluación de conocimientos.
  * **Regla del 70%:** Si aprueba con $\ge 70\%$, emite un certificado digital con sello y código único SHA de verificación.
  * **Control de 2 Intentos:** Máximo 2 intentos. Si reprueba el 1°, se informa el intento restante; si reprueba el 2°, se bloquea la evaluación y se dispara una alerta de escalamiento hacia la administración vía Amazon SES.
* **👨‍🏫 Profesor (Human-in-the-Loop):**
  * Soporte para múltiples docentes (Prof. Andrea Soto, Prof. Mauricio Morales).
  * Bandeja de borradores de cursos propuestos por la IA.
  * Edición pedagógica de módulos y preguntas antes de su publicación.
* **📋 Jefatura:**
  * Creación de cursos manual o asistida por IA mediante extracción de documentos.
  * Protección con **Circuit Breaker** (si se registran 5 fallas consecutivas de la API externa, se abre durante 60 segundos y recomienda la creación manual).
  * Aislamiento **Bulkhead** (máximo 2 ejecuciones concurrentes de IA para no degradar el rendimiento general).
* **⚙️ Administrador & DevOps:**
  * Reporte de cumplimiento por sede (Santiago, Antofagasta, Concepción).
  * Consola de monitoreo de telemetría de resiliencia del Circuit Breaker (estados `CLOSED`, `OPEN`, `HALF_OPEN`).
  * Registro de alertas de escalamiento emitidas por Amazon SES.

### 4. Control de Despliegue Canario (Canary Deployment)
* Controlador interactivo de tráfico canario (0% a 100%).
* Integración con la preferencia `Canary10Percent5Minutes` de AWS SAM.
* Simulador de enrutamiento basado en hash de usuario para distribuir peticiones entre versión Estable (`v1.0.0`) y versión Canario (`v2.0.0-canary`).

---

## 💻 Guía de Ejecución en Modo Local

Para probar y ejecutar la aplicación en tu entorno de desarrollo local sin necesidad de credenciales de AWS activas (el backend incluye un adaptador NoSQL en memoria que emula la semántica de DynamoDB):

### Prerrequisitos
* **Node.js:** Versión 20.x o superior.
* **npm:** Gestor de paquetes incluido con Node.js.

### Paso 1: Iniciar el Backend
Abre una terminal en la raíz del proyecto:
```bash
cd backend
npm install
npm start
```
> El backend quedará activo en: `http://localhost:4000`  
> Inicializará automáticamente los datos semilla de organizaciones, usuarios y cursos en memoria.

### Paso 2: Iniciar el Frontend
Abre una **segunda terminal** en la raíz del proyecto:
```bash
cd frontend
npm install
npm run dev
```
> La aplicación web quedará activa en: `http://localhost:5173`

Abre tu navegador en `http://localhost:5173`. Podrás navegar entre todos los roles, probar el cambio de usuarios en la barra superior izquierda y alternar entre modo claro y oscuro.

---

## ☁️ Guía de Despliegue en AWS Serverless

Para desplegar la arquitectura completa en la nube de Amazon Web Services mediante Infraestructura como Código (IaC).

### Opción A: Despliegue usando AWS SAM CLI (Terminal)

#### Prerrequisitos
1. Tener instalado [AWS CLI](https://aws.amazon.com/cli/) y configurado con credenciales válidas:
   ```bash
   aws configure
   ```
2. Tener instalado [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html):
   ```bash
   sam --version
   ```

#### 1. Compilar y Desplegar el Backend Serverless
```bash
cd backend
sam build
sam deploy --guided
```

Durante el asistente de configuración de SAM, responde los parámetros:
* **Stack Name:** `alumco-serverless-prod`
* **AWS Region:** `us-east-1` (o tu región preferida)
* **Confirm changes before deploy:** `n`
* **Allow SAM CLI IAM role creation:** `y`
* **Disable rollback:** `n`
* **AlumcoApiFunction may not have authorization defined:** `y`
* **SubmitEvaluationFunction may not have authorization defined:** `y`
* **Save arguments to configuration file:** `y`

Al finalizar el despliegue, SAM imprimirá los **Outputs** de CloudFormation:
```text
Key                 ApiUrl
Description         URL pública del API Gateway para la plataforma
Value               https://<api-id>.execute-api.us-east-1.amazonaws.com/prod/
```
> **Copia el valor de `ApiUrl`** generado para tu cuenta.

#### 2. Compilar el Frontend para Producción
En la carpeta `frontend`, crea un archivo llamado `.env.production` indicando la URL de tu API Gateway en AWS (añadiendo `/api` al final):
```env
VITE_API_BASE=https://<api-id>.execute-api.us-east-1.amazonaws.com/prod/api
```

Compila los assets estáticos:
```bash
cd frontend
npm install
npm run build
```
> Esto generará los archivos finales optimizados en la carpeta `frontend/dist/`.

#### 3. Desplegar el Frontend en AWS Amplify Hosting
1. Ingresa a la consola de AWS y busca el servicio **AWS Amplify**.
2. Selecciona **Deploy an app** $\rightarrow$ **Deploy without Git provider**.
3. Configura:
   * **App name:** `Alumco-Plataforma`
   * **Environment name:** `prod`
4. Arrastra la carpeta `frontend/dist/` directamente al área de carga de Amplify.
5. Haz clic en **Save and deploy**. En 30 segundos obtendrás la URL pública HTTPS de tu aplicación.

---

### Opción B: Despliegue Rápido usando AWS CloudShell (Sin instalar herramientas locales)

Si no tienes AWS CLI o SAM CLI instalados en tu computadora local:

1. Entra a la consola web de AWS: [https://console.aws.amazon.com/](https://console.aws.amazon.com/)
2. Abre la terminal integrada **CloudShell** haciendo clic en el ícono `>_` en la barra superior de AWS.
3. Comprime tu carpeta `backend/` local en un archivo `.zip` y súbelo a CloudShell usando el menú **Actions** $\rightarrow$ **Upload file**.
4. En CloudShell ejecuta:
   ```bash
   unzip backend.zip
   cd backend
   sam build
   sam deploy --guided
   ```
5. Copia la URL del API Gateway generada en los outputs, compila el frontend localmente con `npm run build` y súbelo mediante **AWS Amplify Hosting**.

---

## 🧪 Usuarios y Credenciales Demo Precargadas

| Nombre | Rol | Sede | Cargo |
| :--- | :--- | :--- | :--- |
| **Felipe Heredia** | Colaborador (Alumno) | Antofagasta | Técnico de Fundición y Reciclaje |
| **Ignacio Llarlluri** | Colaborador (Alumno) | Concepción | Operario de Planta |
| **Javier Alcaino** | Colaborador (Alumno) | Santiago | Ensamblador de Estructuras |
| **Prof. Andrea Soto** | Profesor (HITL) | Santiago | Coordinadora Académica & Revisor |
| **Prof. Mauricio Morales** | Profesor (HITL) | Antofagasta | Especialista en Prevención de Riesgos |
| **Carlos Mendoza** | Jefatura | Santiago | Jefe de Seguridad y Protocolos |
| **Valentina Garrido** | Administrador & DevOps | Santiago | Directora de Operaciones & RRHH |

*También puedes registrar nuevos colaboradores o profesores en cualquier momento utilizando el botón **`🔑 Login / Registro`** en la esquina superior izquierda de la aplicación.*

---

## 🧹 Limpieza de Recursos en AWS

Para eliminar todos los recursos creados en tu cuenta de AWS y evitar cargos posteriores:
```bash
cd backend
sam delete --stack-name alumco-serverless-prod
```
Y elimina la aplicación correspondiente en la consola de **AWS Amplify**.
