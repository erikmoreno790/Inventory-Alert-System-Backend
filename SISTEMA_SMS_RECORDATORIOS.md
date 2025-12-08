# 📱 Sistema de Recordatorios SMS - Documentación Completa

## 📋 Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Configuración](#configuración)
3. [Estructura de Archivos](#estructura-de-archivos)
4. [Base de Datos](#base-de-datos)
5. [API Endpoints](#api-endpoints)
6. [Ejemplos de Uso](#ejemplos-de-uso)
7. [Integración con Twilio](#integración-con-twilio)

---

## 📝 Descripción General

Sistema completo de recordatorios SMS para enviar notificaciones automáticas a clientes sobre mantenimientos programados de sus vehículos.

### Características Principales:

- ✅ Creación manual y automática de recordatorios
- ✅ Envío de SMS individual y masivo
- ✅ Integración con Twilio para envío real
- ✅ Modo simulación para desarrollo
- ✅ Historial completo de envíos
- ✅ Gestión de estados (pendiente, enviado, cancelado, error)
- ✅ Recordatorios basados en última cotización

---

## ⚙️ Configuración

### 1. Variables de Entorno

Agregar al archivo `.env.local` o `.env`:

```bash
# TWILIO SMS SERVICE
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=tu_auth_token_de_twilio
TWILIO_PHONE_NUMBER=+57300123456

# Habilitar/Deshabilitar envío real (true/false)
SMS_ENABLED=false

# Días por defecto para mantenimiento
DEFAULT_MAINTENANCE_DAYS=90
```

### 2. Obtener Credenciales de Twilio

1. Crear cuenta en https://www.twilio.com
2. Ir al Dashboard: https://console.twilio.com
3. Copiar:
   - Account SID
   - Auth Token
4. Comprar un número de teléfono (Phone Number)
5. Configurar en `.env`

### 3. Crear Tabla en Base de Datos

```bash
psql -U usuario -d nombre_base_datos -f database/create_recordatorios_table.sql
```

O ejecutar manualmente el SQL en pgAdmin/DBeaver.

---

## 📁 Estructura de Archivos

### Nuevos Archivos Creados:

```
Inventory-Alert-System-Backend/
├── src/
│   ├── controllers/
│   │   ├── clienteController.js          ✨ NUEVO
│   │   ├── vehiculoController.js         ✨ NUEVO
│   │   └── recordatorioController.js     ✨ NUEVO
│   │
│   ├── models/
│   │   ├── clienteModel.js               ✨ NUEVO
│   │   ├── vehiculoModel.js              ✨ NUEVO
│   │   ├── recordatorioModel.js          ✨ NUEVO
│   │   └── cotizacionImagenModel.js      ✨ NUEVO
│   │
│   ├── routes/
│   │   ├── clienteRoutes.js              ✨ NUEVO
│   │   ├── vehiculoRoutes.js             ✨ NUEVO
│   │   └── recordatorioRoutes.js         ✨ NUEVO
│   │
│   ├── services/
│   │   └── smsService.js                 ✨ NUEVO
│   │
│   └── server.js                         🔧 ACTUALIZADO
│
└── database/
    └── create_recordatorios_table.sql    ✨ NUEVO
```

---

## 🗄️ Base de Datos

### Tabla: `recordatorios`

```sql
CREATE TABLE recordatorios (
    recordatorio_id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL,
    vehiculo_id INTEGER NOT NULL,
    tipo VARCHAR(50) DEFAULT 'mantenimiento',
    fecha_programada DATE NOT NULL,
    mensaje TEXT NOT NULL,
    telefono VARCHAR(20),
    enviado BOOLEAN DEFAULT false,
    fecha_envio TIMESTAMP,
    estado VARCHAR(20) DEFAULT 'pendiente',
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(cliente_id),
    FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(vehiculo_id)
);
```

### Relaciones:

- `cliente_id` → `clientes.cliente_id`
- `vehiculo_id` → `vehiculos.vehiculo_id`

### Estados Posibles:

- `pendiente` - Creado pero no enviado
- `enviado` - SMS enviado exitosamente
- `cancelado` - Cancelado por usuario
- `error` - Error al enviar

---

## 🌐 API Endpoints

### Clientes

| Método | Endpoint                          | Descripción                              |
| ------ | --------------------------------- | ---------------------------------------- |
| GET    | `/api/clientes`                   | Obtener todos los clientes (con filtros) |
| GET    | `/api/clientes/search?nombre=...` | Buscar por nombre                        |
| GET    | `/api/clientes/stats`             | Estadísticas de clientes                 |
| GET    | `/api/clientes/:id`               | Obtener cliente por ID                   |
| GET    | `/api/clientes/:id/vehiculos`     | Cliente con sus vehículos                |
| POST   | `/api/clientes`                   | Crear cliente                            |
| PUT    | `/api/clientes/:id`               | Actualizar cliente                       |
| DELETE | `/api/clientes/:id`               | Eliminar cliente                         |

### Vehículos

| Método | Endpoint                             | Descripción                               |
| ------ | ------------------------------------ | ----------------------------------------- |
| GET    | `/api/vehiculos`                     | Obtener todos los vehículos (con filtros) |
| GET    | `/api/vehiculos/stats`               | Estadísticas de vehículos                 |
| GET    | `/api/vehiculos/placa/:placa`        | Buscar por placa                          |
| GET    | `/api/vehiculos/cliente/:cliente_id` | Vehículos de un cliente                   |
| GET    | `/api/vehiculos/:id`                 | Obtener vehículo por ID                   |
| GET    | `/api/vehiculos/:id/movimientos`     | Vehículo con movimientos                  |
| GET    | `/api/vehiculos/:id/cotizaciones`    | Vehículo con cotizaciones                 |
| POST   | `/api/vehiculos`                     | Crear vehículo                            |
| PUT    | `/api/vehiculos/:id`                 | Actualizar vehículo                       |
| DELETE | `/api/vehiculos/:id`                 | Eliminar vehículo                         |

### Recordatorios

| Método | Endpoint                                   | Descripción                   |
| ------ | ------------------------------------------ | ----------------------------- |
| GET    | `/api/recordatorios`                       | Obtener todos (con filtros)   |
| GET    | `/api/recordatorios/pendientes`            | Recordatorios pendientes      |
| GET    | `/api/recordatorios/stats`                 | Estadísticas                  |
| GET    | `/api/recordatorios/cliente/:cliente_id`   | Por cliente                   |
| GET    | `/api/recordatorios/vehiculo/:vehiculo_id` | Por vehículo                  |
| GET    | `/api/recordatorios/:id`                   | Por ID                        |
| POST   | `/api/recordatorios`                       | Crear recordatorio            |
| POST   | `/api/recordatorios/auto-create`           | Crear desde última cotización |
| POST   | `/api/recordatorios/:id/enviar`            | Enviar SMS individual         |
| POST   | `/api/recordatorios/enviar-masivo`         | Enviar SMS masivo             |
| POST   | `/api/recordatorios/:id/cancelar`          | Cancelar recordatorio         |
| PUT    | `/api/recordatorios/:id`                   | Actualizar recordatorio       |
| DELETE | `/api/recordatorios/:id`                   | Eliminar recordatorio         |

---

## 💡 Ejemplos de Uso

### 1. Crear Cliente con Vehículo

```javascript
// 1. Crear cliente
POST /api/clientes
{
  "nombre": "Juan Pérez",
  "documento": "123456789",
  "telefono": "3001234567",
  "email": "juan@example.com",
  "direccion": "Calle 123 #45-67"
}

// 2. Crear vehículo del cliente
POST /api/vehiculos
{
  "cliente_id": 1,
  "placa": "ABC123",
  "marca_modelo": "Toyota Corolla 2020"
}
```

### 2. Crear Recordatorio Manual

```javascript
POST /api/recordatorios
{
  "cliente_id": 1,
  "vehiculo_id": 1,
  "tipo": "mantenimiento",
  "fecha_programada": "2025-01-15",
  "mensaje": "Hola Juan! Es momento de traer tu vehículo ABC123 para mantenimiento.",
  "telefono": "3001234567"
}
```

### 3. Crear Recordatorio Automático

```javascript
// Basado en última cotización aprobada
POST /api/recordatorios/auto-create?dias=90
{
  "vehiculo_id": 1
}
```

### 4. Enviar SMS Individual

```javascript
POST /api/recordatorios/1/enviar

// Respuesta:
{
  "success": true,
  "message": "SMS enviado exitosamente",
  "data": {
    "success": true,
    "sid": "SMxxxxxxxxxxxxx",
    "status": "queued",
    "to": "+573001234567"
  }
}
```

### 5. Enviar SMS Masivo

```javascript
POST /api/recordatorios/enviar-masivo
{
  "fecha_limite": "2025-01-15"
}

// Respuesta:
{
  "success": true,
  "message": "Envío masivo completado",
  "data": {
    "total": 10,
    "sent": 8,
    "failed": 2,
    "errors": [...]
  }
}
```

### 6. Consultar Recordatorios Pendientes

```javascript
GET /api/recordatorios/pendientes?fecha_limite=2025-01-15

// Respuesta:
{
  "success": true,
  "data": [
    {
      "recordatorio_id": 1,
      "cliente_nombre": "Juan Pérez",
      "vehiculo_placa": "ABC123",
      "fecha_programada": "2025-01-15",
      "mensaje": "...",
      "estado": "pendiente",
      "enviado": false
    }
  ],
  "count": 1
}
```

---

## 📲 Integración con Twilio

### Modo Simulación (Desarrollo)

```bash
# .env.local
SMS_ENABLED=false
```

En este modo:

- No se envían SMS reales
- Se loguea en consola
- No se consumen créditos de Twilio
- Útil para testing

### Modo Producción

```bash
# .env
SMS_ENABLED=true
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+57300123456
```

### Formato de Números

El servicio formatea automáticamente números colombianos:

```
Entrada: 3001234567
Salida:  +573001234567

Entrada: 573001234567
Salida:  +573001234567

Entrada: +573001234567
Salida:  +573001234567 (sin cambios)
```

### Plantillas de Mensajes

```javascript
// Recordatorio de mantenimiento
smsService.createMaintenanceReminder("Juan", "ABC123", "2025-01-15");
// → "Hola Juan! Te recordamos traer tu vehículo ABC123 al taller..."

// Cotización aprobada
smsService.createQuotationApprovedMessage("Juan", "ABC123", 150000);
// → "Hola Juan! Tu cotización para el vehículo ABC123 ha sido aprobada..."

// Mensaje personalizado
smsService.createCustomMessage(
  "Hola {nombre}! Tu vehículo {placa} está listo.",
  { nombre: "Juan", placa: "ABC123" }
);
// → "Hola Juan! Tu vehículo ABC123 está listo."
```

---

## 🚀 Flujo de Trabajo Recomendado

### 1. Configuración Inicial

1. Ejecutar SQL para crear tabla `recordatorios`
2. Configurar variables de entorno
3. Reiniciar servidor

### 2. Crear Recordatorios

**Opción A: Manual**

```
POST /api/recordatorios → Crear recordatorio específico
```

**Opción B: Automático**

```
POST /api/recordatorios/auto-create → Basado en última cotización
```

### 3. Revisión de Pendientes

```
GET /api/recordatorios/pendientes → Ver recordatorios listos para enviar
```

### 4. Envío de SMS

**Opción A: Individual**

```
POST /api/recordatorios/:id/enviar → Enviar uno específico
```

**Opción B: Masivo**

```
POST /api/recordatorios/enviar-masivo → Enviar todos los pendientes
```

### 5. Monitoreo

```
GET /api/recordatorios/stats → Ver estadísticas
GET /api/recordatorios?estado=enviado → Ver enviados
GET /api/recordatorios?estado=error → Ver errores
```

---

## 📊 Estadísticas y Reportes

```javascript
GET /api/recordatorios/stats

// Respuesta:
{
  "success": true,
  "data": {
    "total": 50,
    "enviados": 35,
    "pendientes": 10,
    "cancelados": 3,
    "con_error": 2
  }
}
```

---

## 🔐 Seguridad y Permisos

Todos los endpoints requieren autenticación JWT.

Roles requeridos:

- `admin` - Acceso completo
- `user` - Acceso limitado (no puede eliminar)

---

## ✅ Checklist de Implementación

- [x] Crear tabla en base de datos
- [x] Configurar variables de entorno
- [x] Obtener credenciales de Twilio (opcional si SMS_ENABLED=false)
- [x] Reiniciar servidor
- [x] Probar endpoints con Postman
- [x] Crear recordatorios de prueba
- [x] Enviar SMS de prueba

---

## 📝 Notas Finales

- Los SMS en modo simulación se loguean en consola
- Twilio cobra por SMS enviado (~$0.0079 USD/SMS en Colombia)
- Se recomienda empezar con SMS_ENABLED=false
- Los números deben ser válidos y verificados en Twilio Trial
- Rate limiting: 100 req/15min general, cuida no hacer spam

---

**¡Sistema de Recordatorios SMS completamente funcional! 🎉**
