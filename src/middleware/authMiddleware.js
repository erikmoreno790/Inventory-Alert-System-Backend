const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token requerido' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, role }
        next();
    } catch {
        return res.status(403).json({ message: 'Token inválido' });
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
