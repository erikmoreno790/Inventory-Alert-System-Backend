const pool = require('../config/db');

/**
 * Modelo para la tabla cotizacion_imagenes
 */
const CotizacionImagenModel = {
    /**
     * Crear una nueva imagen asociada a una cotización
     * @param {Object} data - Datos de la imagen
     * @returns {Object} - Imagen creada
     */
    async create(data, queryRunner = null) {
        const db = queryRunner || pool;
        const {
            id_cotizacion,
            imagen_url
        } = data;

        const query = `
      INSERT INTO cotizacion_imagenes (id_cotizacion, imagen_url)
      VALUES ($1, $2)
      RETURNING *
    `;

        const values = [id_cotizacion, imagen_url];
        const { rows } = await db.query(query, values);
        return rows[0];
    },

    /**
     * Crear múltiples imágenes para una cotización
     * @param {number} idCotizacion - ID de la cotización
     * @param {Array<string>} imagenesUrls - Array de URLs de imágenes
     * @returns {Array} - Imágenes creadas
     */
    async createMultiple(idCotizacion, imagenesUrls) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const imagenesCreadas = [];
            for (const url of imagenesUrls) {
                const result = await client.query(
                    'INSERT INTO cotizacion_imagenes (id_cotizacion, imagen_url) VALUES ($1, $2) RETURNING *',
                    [idCotizacion, url]
                );
                imagenesCreadas.push(result.rows[0]);
            }

            await client.query('COMMIT');
            return imagenesCreadas;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    /**
     * Obtener todas las imágenes de una cotización
     * @param {number} idCotizacion - ID de la cotización
     * @returns {Array} - Lista de imágenes
     */
    async findByCotizacionId(idCotizacion) {
        const query = `
      SELECT * FROM cotizacion_imagenes 
      WHERE id_cotizacion = $1
      ORDER BY id_imagen ASC
    `;
        const { rows } = await pool.query(query, [idCotizacion]);
        return rows;
    },

    /**
     * Obtener una imagen por ID
     * @param {number} id - ID de la imagen
     * @returns {Object|null} - Imagen encontrada o null
     */
    async findById(id) {
        const query = 'SELECT * FROM cotizacion_imagenes WHERE id_imagen = $1';
        const { rows } = await pool.query(query, [id]);
        return rows[0] || null;
    },

    /**
     * Obtener URLs de imágenes de una cotización
     * @param {number} idCotizacion - ID de la cotización
     * @returns {Array<string>} - Array de URLs
     */
    async getUrlsByCotizacionId(idCotizacion) {
        const query = `
      SELECT imagen_url FROM cotizacion_imagenes 
      WHERE id_cotizacion = $1
      ORDER BY id_imagen ASC
    `;
        const { rows } = await pool.query(query, [idCotizacion]);
        return rows.map(row => row.imagen_url);
    },

    /**
     * Actualizar la URL de una imagen
     * @param {number} id - ID de la imagen
     * @param {string} nuevaUrl - Nueva URL
     * @returns {Object|null} - Imagen actualizada o null
     */
    async update(id, nuevaUrl) {
        const query = `
      UPDATE cotizacion_imagenes 
      SET imagen_url = $1 
      WHERE id_imagen = $2 
      RETURNING *
    `;
        const { rows } = await pool.query(query, [nuevaUrl, id]);
        return rows[0] || null;
    },

    /**
     * Eliminar una imagen
     * @param {number} id - ID de la imagen
     * @returns {Object|null} - Imagen eliminada
     */
    async delete(id) {
        const query = 'DELETE FROM cotizacion_imagenes WHERE id_imagen = $1 RETURNING *';
        const { rows } = await pool.query(query, [id]);
        return rows[0] || null;
    },

    /**
     * Eliminar todas las imágenes de una cotización
     * @param {number} idCotizacion - ID de la cotización
     * @returns {Array} - Imágenes eliminadas
     */
    async deleteByCotizacionId(idCotizacion) {
        const query = 'DELETE FROM cotizacion_imagenes WHERE id_cotizacion = $1 RETURNING *';
        const { rows } = await pool.query(query, [idCotizacion]);
        return rows;
    },

    /**
     * Contar imágenes de una cotización
     * @param {number} idCotizacion - ID de la cotización
     * @returns {number} - Cantidad de imágenes
     */
    async countByCotizacionId(idCotizacion) {
        const query = 'SELECT COUNT(*) FROM cotizacion_imagenes WHERE id_cotizacion = $1';
        const { rows } = await pool.query(query, [idCotizacion]);
        return parseInt(rows[0].count, 10);
    },

    /**
     * Verificar si una cotización tiene imágenes
     * @param {number} idCotizacion - ID de la cotización
     * @returns {boolean} - True si tiene imágenes, false si no
     */
    async hasImages(idCotizacion) {
        const count = await this.countByCotizacionId(idCotizacion);
        return count > 0;
    },

    /**
     * Obtener cotizaciones con sus imágenes
     * @param {Array<number>} cotizacionesIds - Array de IDs de cotizaciones
     * @returns {Object} - Objeto con cotizaciones como claves y arrays de URLs como valores
     */
    async getImagenesByCotizacionIds(cotizacionesIds) {
        if (!cotizacionesIds || cotizacionesIds.length === 0) {
            return {};
        }

        const query = `
      SELECT id_cotizacion, imagen_url 
      FROM cotizacion_imagenes 
      WHERE id_cotizacion = ANY($1)
      ORDER BY id_cotizacion, id_imagen
    `;
        const { rows } = await pool.query(query, [cotizacionesIds]);

        // Agrupar por cotización
        const resultado = {};
        rows.forEach(row => {
            if (!resultado[row.id_cotizacion]) {
                resultado[row.id_cotizacion] = [];
            }
            resultado[row.id_cotizacion].push(row.imagen_url);
        });

        return resultado;
    },

    /**
     * Reemplazar todas las imágenes de una cotización
     * @param {number} idCotizacion - ID de la cotización
     * @param {Array<string>} nuevasUrls - Nuevas URLs de imágenes
     * @returns {Array} - Imágenes creadas
     */
    async replaceAllByCotizacionId(idCotizacion, nuevasUrls) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Eliminar imágenes existentes
            await client.query('DELETE FROM cotizacion_imagenes WHERE id_cotizacion = $1', [idCotizacion]);

            // Insertar nuevas imágenes
            const imagenesCreadas = [];
            for (const url of nuevasUrls) {
                const result = await client.query(
                    'INSERT INTO cotizacion_imagenes (id_cotizacion, imagen_url) VALUES ($1, $2) RETURNING *',
                    [idCotizacion, url]
                );
                imagenesCreadas.push(result.rows[0]);
            }

            await client.query('COMMIT');
            return imagenesCreadas;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = CotizacionImagenModel;
