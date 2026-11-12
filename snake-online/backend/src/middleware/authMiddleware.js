
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // Comprobar que se envio un token
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Debes iniciar sesion para acceder'
            });
        }

        const token = authHeader.split(' ')[1];

        // Verificar que el token sea valido
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Consultar el estado y rol actuales del usuario
        const { data: user, error } = await supabase
            .from('users')
            .select('id, role, status')
            .eq('id', decoded.userId)
            .maybeSingle();

        if (error) {
            console.error('Error verificando usuario:', error.message);

            return res.status(503).json({
                success: false,
                message: 'No se pudo verificar la cuenta'
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'La cuenta no existe'
            });
        }

        // Comprobar si la cuenta esta bloqueada
        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Tu cuenta se encuentra bloqueada'
            });
        }

        // Usar los datos actuales de la base de datos
        req.user = {
            userId: user.id,
            role: user.role
        };

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Token invalido o expirado'
        });
    }
};

module.exports = {
    authenticateToken
};
