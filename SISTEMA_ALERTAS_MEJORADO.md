# Sistema de Alertas Mejorado - Documentación

## 📋 Resumen de Cambios

Se ha implementado un sistema de alertas completamente funcional y automático para el inventario, con prioridades basadas en niveles de stock.

---

## 🎯 Niveles de Prioridad

### ⚠️ **URGENTE** (stock = 0)

- Repuesto completamente agotado
- Requiere acción inmediata
- Mensaje: "⚠️ URGENTE: [nombre] sin stock disponible (0 unidades)"

### 🔴 **ALTA** (stock = 1)

- Solo 1 unidad disponible
- Requiere reabastecimiento urgente
- Mensaje: "🔴 ALTA: [nombre] tiene solo 1 unidad en stock"

### 🟡 **MODERADA** (stock entre 2 y 4)

- Stock bajo pero aún disponible
- Planificar reabastecimiento próximamente
- Mensaje: "🟡 MODERADA: [nombre] tiene stock bajo (X unidades)"

### 🟢 **BAJA** (stock >= 5)

- Stock normalizado
- **Las alertas se eliminan automáticamente**

---

## 🔧 Cambios Implementados

### 1. **Base de Datos**

- ✅ Agregado campo `prioridad` a tabla `alertas`
- ✅ Eliminado campo `stock_minimo` de tabla `repuestos`
- 📄 Script de migración: `database/migrations/001_update_alerts_system.sql`

### 2. **Modelo de Alertas (`alertModel.js`)**

- ✅ Nueva lógica de prioridades automática
- ✅ Auto-eliminación de alertas cuando stock >= 5
- ✅ Actualización de alertas existentes si cambia la prioridad
- ✅ Evita duplicación de alertas
- ✅ Nuevo método `getEstadisticas()` para dashboard
- ✅ Mensajes descriptivos con emojis

### 3. **Modelo de Movimientos (`movimientoModel.js`)**

- ✅ Generación automática de alertas en `create()`
- ✅ Generación automática de alertas en `update()`
- ✅ Generación automática de alertas en `delete()`
- ✅ Manejo de errores sin afectar operaciones principales

### 4. **Controlador de Alertas (`alertController.js`)**

- ✅ Nuevo endpoint: `POST /api/alerts/generar` - Generar alertas manualmente
- ✅ Nuevo endpoint: `GET /api/alerts/estadisticas` - Obtener estadísticas

### 5. **Rutas (`alertRoutes.js`)**

- ✅ Corregidas las rutas:
  - `GET /api/alerts/` - Todas las alertas
  - `GET /api/alerts/estadisticas` - Estadísticas
  - `GET /api/alerts/:id` - Alerta específica
  - `PUT /api/alerts/:id/read` - Marcar como leída
  - `DELETE /api/alerts/:id` - Eliminar alerta
  - `POST /api/alerts/generar` - Generar alertas manualmente

### 6. **Modelo de Repuestos (`repuestoModel.js`)**

- ✅ Eliminadas referencias a `stock_minimo`

---

## 🚀 Funcionalidades

### **Generación Automática**

Las alertas se generan automáticamente al:

- Crear un movimiento de inventario (entrada/salida)
- Actualizar un movimiento existente
- Eliminar un movimiento

### **Auto-resolución**

- Las alertas se **eliminan automáticamente** cuando el stock llega a 5 o más unidades
- Las alertas se **actualizan** si cambia el nivel de prioridad

### **Evita Duplicados**

- Solo existe una alerta activa (no leída) por repuesto
- Al crear una nueva alerta, se actualiza la existente si es necesario

---

## 📊 Endpoints API

### Obtener todas las alertas

```
GET /api/alerts/
Authorization: Bearer {token}
```

**Respuesta:**

```json
[
  {
    "alerta_id": 1,
    "repuesto_id": 15,
    "mensaje": "⚠️ URGENTE: Filtro de aceite sin stock disponible (0 unidades)",
    "tipo": "stock_bajo",
    "prioridad": "urgente",
    "leida": false,
    "fecha": "2025-12-07T10:30:00.000Z",
    "repuesto_nombre": "Filtro de aceite",
    "stock_actual": 0
  }
]
```

### Obtener estadísticas

```
GET /api/alerts/estadisticas
Authorization: Bearer {token}
```

**Respuesta:**

```json
[
  {
    "prioridad": "urgente",
    "cantidad": "3",
    "no_leidas": "3"
  },
  {
    "prioridad": "alta",
    "cantidad": "5",
    "no_leidas": "4"
  },
  {
    "prioridad": "moderada",
    "cantidad": "8",
    "no_leidas": "6"
  }
]
```

### Generar alertas manualmente

```
POST /api/alerts/generar
Authorization: Bearer {token}
```

**Respuesta:**

```json
{
  "mensaje": "Proceso de generación de alertas completado",
  "resultados": {
    "urgente": 3,
    "alta": 5,
    "moderada": 8,
    "eliminadas": 12,
    "total": 28
  }
}
```

### Marcar como leída

```
PUT /api/alerts/:id/read
Authorization: Bearer {token}
```

### Eliminar alerta

```
DELETE /api/alerts/:id
Authorization: Bearer {token}
```

---

## 🔄 Flujo de Trabajo

### Escenario 1: Salida de inventario

1. Usuario registra una salida de 10 unidades
2. Stock pasa de 12 a 2 unidades
3. **Sistema genera automáticamente alerta MODERADA**

### Escenario 2: Nueva entrada

1. Se registra entrada de 5 unidades
2. Stock pasa de 2 a 7 unidades
3. **Sistema elimina automáticamente la alerta existente**

### Escenario 3: Stock crítico

1. Se registra salida, stock llega a 0
2. **Sistema actualiza alerta existente a URGENTE**
3. Frontend puede mostrar notificación push

---

## 📝 Notas Importantes

### Antes de Ejecutar

1. **Ejecutar la migración SQL:**

   ```sql
   -- Ejecutar: database/migrations/001_update_alerts_system.sql
   ```

2. **Verificar que no haya errores en la base de datos**

3. **Generar alertas iniciales (opcional):**
   ```bash
   POST /api/alerts/generar
   ```

### Compatibilidad Frontend

El frontend debe actualizarse para:

- Eliminar referencias a `stock_minimo` en formularios
- Mostrar el campo `prioridad` en las alertas
- Usar códigos de color según prioridad
- Mostrar estadísticas del dashboard

### Rendimiento

- Las alertas se generan de forma asíncrona
- Si falla la generación de una alerta, no afecta el movimiento de inventario
- Se registran errores en el logger para diagnóstico

---

## ✅ Testing Sugerido

1. **Crear repuesto con stock 0** → Verificar alerta URGENTE
2. **Agregar entrada de 1 unidad** → Verificar actualización a ALTA
3. **Agregar 5 unidades más** → Verificar eliminación automática
4. **Registrar salida hasta stock 3** → Verificar alerta MODERADA
5. **Consultar estadísticas** → Verificar conteo correcto

---

## 🐛 Troubleshooting

### Las alertas no se generan automáticamente

- Verificar que `AlertaModel` esté importado en `movimientoModel.js`
- Revisar logs del servidor para errores
- Confirmar que la migración SQL se ejecutó correctamente

### Alertas duplicadas

- No debería ocurrir con la nueva lógica
- Si ocurre, ejecutar manualmente `POST /api/alerts/generar` para limpiar

### Error en prioridad

- Verificar que el campo `prioridad` exista en la tabla
- Ejecutar migración SQL si no existe

---

## 📅 Última actualización

**Fecha:** 7 de diciembre de 2025  
**Versión:** 2.0
