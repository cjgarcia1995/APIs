
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'No tienes permisos de administrador'
        });
    }

    next();
}

module.exports = { requireAdmin };
