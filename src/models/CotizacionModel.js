const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

// Crear cotización con múltiples imágenes
const crearCotizacion = async (req, res) => {
  const {
    fecha,
    nombre_cliente,
    nit_cc,
    telefono,
    vehiculo,
    modelo,
    placa,
    kilometraje,
    nombre_mecanico,
    observaciones,
    estatus,
    porcentaje_descuento,
    descuento,
    subtotal,
    total,
    items
  } = req.body;

  const imagenes = req.files || []; // Array de imágenes

  // Normalizar valores vacíos
  const safeValues = {
    fecha: fecha || new Date(),
    nombre_cliente,
    nit_cc: nit_cc || null,
    telefono: telefono || null,
    vehiculo: vehiculo || null,
    modelo: modelo || null,
    placa,
    kilometraje: kilometraje ? Number(kilometraje) : null,
    nombre_mecanico: nombre_mecanico || null,
    observaciones: observaciones || "",
    estatus: estatus || "Pendiente",
    porcentaje_descuento: porcentaje_descuento || 0,
    descuento: descuento || 0,
    subtotal: subtotal || 0,
    total: total || 0,
  };

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Insertar cotización
    const cotizacionRes = await client.query(
      `INSERT INTO cotizaciones 
        (fecha, nombre_cliente, nit_cc, telefono, vehiculo, modelo, placa, kilometraje, nombre_mecanico, observaciones, estatus, porcentaje_descuento, descuento, subtotal, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, $14,$15)
       RETURNING id_cotizacion`,
      [
        safeValues.fecha,
        safeValues.nombre_cliente,
        safeValues.nit_cc,
        safeValues.telefono,
        safeValues.vehiculo,
        safeValues.modelo,
        safeValues.placa,
        safeValues.kilometraje,
        safeValues.nombre_mecanico,
        safeValues.observaciones,
        safeValues.estatus,
        safeValues.porcentaje_descuento,
        safeValues.descuento,
        safeValues.subtotal,
        safeValues.total
      ]
    );

    const idCotizacion = cotizacionRes.rows[0].id_cotizacion;

    // 🔹 Asegúrate de parsear items
    let { items } = req.body;

    try {
      items = JSON.parse(items); // Convierte el string JSON a array real
    } catch (err) {
      console.error("Error parseando items:", err);
      items = [];
    }

    // Insertar items
    for (const item of items) {
      await client.query(
        `INSERT INTO cotizacion_items
          (id_cotizacion, descripcion, cantidad, precio_unitario, total)
         VALUES ($1, $2, $3, $4, $5)`,
        [idCotizacion, item.descripcion, item.cantidad, item.precio_unitario, item.sub_total]
      );
    }

    // Insertar imágenes
    for (const img of imagenes) {
      const imageUrl = `uploads/${img.filename}`;;
      await client.query(
        `INSERT INTO cotizacion_imagenes (id_cotizacion, imagen_url)
         VALUES ($1, $2)`,
        [idCotizacion, imageUrl]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Cotización creada con imágenes', id: idCotizacion });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Error guardando cotización' });
  } finally {
    client.release();
  }
};

// Mostrar todas las cotizaciones
const mostrarCotizaciones = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cotizaciones ORDER BY id_cotizacion DESC');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener cotizaciones' });
  }
};

// Ver cotización con sus items e imágenes
const verCotizacion = async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Buscar cotización
    const cotizacionRes = await pool.query(
      'SELECT * FROM cotizaciones WHERE id_cotizacion = $1',
      [id]
    );
    if (cotizacionRes.rows.length === 0) {
      return res.status(404).json({ message: 'Cotización no encontrada' });
    }

    // 2. Buscar items asociados
    const itemsRes = await pool.query(
      'SELECT * FROM cotizacion_items WHERE id_cotizacion = $1',
      [id]
    );

    // 3. Buscar imágenes asociadas
    const imagenesRes = await pool.query(
      'SELECT imagen_url FROM cotizacion_imagenes WHERE id_cotizacion = $1',
      [id]
    );

    // 4. Armar respuesta
    const cotizacion = cotizacionRes.rows[0];
    cotizacion.items = itemsRes.rows;

    // Convertir URLs relativas en absolutas
    cotizacion.imagenes = imagenesRes.rows.map(img => ({
      url: `${req.protocol}://${req.get("host")}/${img.imagen_url}`
    }));

    res.status(200).json(cotizacion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener cotización' });
  }
};

const actualizarCotizacion = async (req, res) => {
  const {
    id_cotizacion,
    fecha,
    nombre_cliente,
    nit_cc,
    telefono,
    vehiculo,
    modelo,
    placa,
    kilometraje,
    nombre_mecanico,
    observaciones,
    estatus,
    porcentaje_descuento,
    descuento,
    subtotal,
    total,
    items
  } = req.body;

  const safeValues = {
    fecha: fecha || new Date(),
    nombre_cliente,
    nit_cc: nit_cc || null,
    telefono: telefono || null,
    vehiculo: vehiculo || null,
    modelo: modelo || null,
    placa,
    kilometraje: kilometraje ? Number(kilometraje) : null,
    nombre_mecanico: nombre_mecanico || null,
    observaciones: observaciones || "",
    estatus: estatus || "Pendiente",
    porcentaje_descuento: porcentaje_descuento || 0,
    descuento: descuento || 0,
    subtotal: subtotal || 0,
    total: total || 0,
  };

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1️⃣ Actualizar cotización
    await client.query(
      `UPDATE cotizaciones SET
        fecha=$1, nombre_cliente=$2, nit_cc=$3, telefono=$4, vehiculo=$5, modelo=$6, placa=$7, kilometraje=$8,
        nombre_mecanico=$9, observaciones=$10, estatus=$11,
        porcentaje_descuento=$12, descuento=$13, subtotal=$14, total=$15
       WHERE id_cotizacion=$16`,
      [
        safeValues.fecha,
        safeValues.nombre_cliente,
        safeValues.nit_cc,
        safeValues.telefono,
        safeValues.vehiculo,
        safeValues.modelo,
        safeValues.placa,
        safeValues.kilometraje,
        safeValues.nombre_mecanico,
        safeValues.observaciones,
        safeValues.estatus,
        safeValues.porcentaje_descuento,
        safeValues.descuento,
        safeValues.subtotal,
        safeValues.total,
        id_cotizacion
      ]
    );

    // 2️⃣ Manejar items
    // a) Obtener ids actuales de la DB
    const existingItemsRes = await client.query(
      'SELECT id_cotizacion_item FROM cotizacion_items WHERE id_cotizacion=$1',
      [id_cotizacion]
    );
    const existingIds = existingItemsRes.rows.map(r => r.id_cotizacion_item);

    // b) Separar items a actualizar vs insertar
    const itemsToUpdate = items.filter(i => i.id_cotizacion_item); // tienen id
    const itemsToInsert = items.filter(i => !i.id_cotizacion_item); // nuevos

    // Actualizar items existentes
    for (const item of itemsToUpdate) {
      await client.query(
        `UPDATE cotizacion_items SET
          descripcion=$1, cantidad=$2, precio_unitario=$3, total=$4
         WHERE id_cotizacion_item=$5`,
        [item.descripcion, item.cantidad, item.precio_unitario, item.total, item.id_cotizacion_item]
      );
    }

    // Insertar nuevos items
    for (const item of itemsToInsert) {
      await client.query(
        `INSERT INTO cotizacion_items
          (id_cotizacion, descripcion, cantidad, precio_unitario, total)
         VALUES ($1,$2,$3,$4,$5)`,
        [id_cotizacion, item.descripcion, item.cantidad, item.precio_unitario, item.sub_total]
      );
    }

    // Eliminar items que fueron removidos
    const updatedIds = itemsToUpdate.map(i => i.id_cotizacion_item);
    const idsToDelete = existingIds.filter(id => !updatedIds.includes(id));
    if (idsToDelete.length > 0) {
      await client.query(
        `DELETE FROM cotizacion_items WHERE id_cotizacion_item = ANY($1)`,
        [idsToDelete]
      );
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Cotización actualizada', id: id_cotizacion });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Error actualizando cotización' });
  } finally {
    client.release();
  };
};

// Eliminar cotización con sus items e imágenes (incluye archivos físicos)
const eliminarCotizacion = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1️⃣ Obtener rutas de las imágenes antes de borrarlas de la DB
    const imagenesRes = await client.query(
      `SELECT imagen_url FROM cotizacion_imagenes WHERE id_cotizacion = $1`,
      [id]
    );

    const imagenes = imagenesRes.rows;

    // 2️⃣ Eliminar físicamente las imágenes
    for (const img of imagenes) {
      const filePath = path.join(__dirname, '..', 'public', img.imagen_url);

      fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`No se pudo borrar: ${filePath}`, err.message);
        } else {
          console.log(`Imagen eliminada: ${filePath}`);
        }
      });
    }

    // 3️⃣ Eliminar registros de imágenes
    await client.query(
      `DELETE FROM cotizacion_imagenes WHERE id_cotizacion = $1`,
      [id]
    );

    // 4️⃣ Eliminar items
    await client.query(
      `DELETE FROM cotizacion_items WHERE id_cotizacion = $1`,
      [id]
    );

    // 5️⃣ Eliminar la cotización
    const result = await client.query(
      `DELETE FROM cotizaciones WHERE id_cotizacion = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Cotización no encontrada' });
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Cotización y archivos eliminados correctamente' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Error eliminando cotización' });
  } finally {
    client.release();
  }

};

// Mostrar cantidad de cotizaciones aprobadas
const contarCotizacionesAprobadas = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM cotizaciones WHERE estatus = 'Aprobada'`
    );
    const count = parseInt(result.rows[0].count, 10);
    res.status(200).json({ aprobadas: count });
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error contando cotizaciones aprobadas' });
  }
};

// Mostar distribución de órdenes por mecánico (para gráficos)
const distribucionPorMecanico = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT nombre_mecanico, COUNT(*) AS total
        FROM cotizaciones
        GROUP BY nombre_mecanico`
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error obteniendo distribución por mecánico' });
  }
};

// Mostrar cotizaciones por semana (para gráficos)
const cotizacionesPorSemana = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DATE_TRUNC('week', fecha) AS semana, COUNT(*) AS total
        FROM cotizaciones
        GROUP BY semana
        ORDER BY semana DESC
        LIMIT 10`
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error obteniendo cotizaciones por semana' });
  }
};



module.exports = { crearCotizacion, mostrarCotizaciones, verCotizacion, actualizarCotizacion, eliminarCotizacion, contarCotizacionesAprobadas, distribucionPorMecanico, cotizacionesPorSemana };
