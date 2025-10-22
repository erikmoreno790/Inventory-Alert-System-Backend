const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token requerido' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // asegúrate de que el token contenga id_usuario y rol
        req.user = {
            id_usuario: decoded.id_usuario || decoded.id, // por compatibilidad
            rol: decoded.rol || decoded.role,
        };
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Token inválido', details: err.message });
    }
};


const authorize = (...roles) => {
    return (req, res, next) => {
        // console.log(`Usuario rol: ${req.user.rol}, Roles permitidos: ${roles.join(', ')}`);
        // console.log("Verificando autorización...");
        // console.log("Usuario autorizado");
        if (!roles.includes(req.user.rol)) {
            return res.status(403).json({ message: 'Acceso denegado' });
        }
        next();
    };
};

module.exports = { authenticate, authorize };
