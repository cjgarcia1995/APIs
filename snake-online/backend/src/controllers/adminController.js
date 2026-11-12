
const { z } = require('zod');
const supabase = require('../config/supabase');

// Consultar todos los usuarios
async function getUsers(req, res) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, username, role, status, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error consultando usuarios:', error);

            return res.status(500).json({
                success: false,
                message: 'No se pudieron consultar los usuarios'
            });
        }

        return res.status(200).json({
            success: true,
            total: data.length,
            users: data
        });

    } catch (error) {
        console.error('Error inesperado:', error);

        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
}


// Bloquear un usuario
async function banUser(req, res) {
    try {
        const idSchema = z.string().uuid();

        const idValidation = idSchema.safeParse(req.params.id);

        if (!idValidation.success) {
            return res.status(400).json({
                success: false,
                message: 'El ID del usuario no es válido'
            });
        }

        const bodySchema = z.object({
            reason: z.string().trim().min(3).max(500)
        });

        const bodyValidation = bodySchema.safeParse(req.body);

        if (!bodyValidation.success) {
            return res.status(400).json({
                success: false,
                message: 'Debes proporcionar un motivo válido'
            });
        }

        const { data, error } = await supabase.rpc('ban_user', {
            p_admin_id: req.user.userId,
            p_user_id: req.params.id,
            p_reason: bodyValidation.data.reason
        });

        if (error) {
            console.error('Error al bloquear usuario:', error.message);

            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error('Error inesperado:', error);

        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
}


// Desbloquear un usuario
async function unbanUser(req, res) {
    try {
        const idSchema = z.string().uuid();

        const idValidation = idSchema.safeParse(req.params.id);

        if (!idValidation.success) {
            return res.status(400).json({
                success: false,
                message: 'El ID del usuario no es válido'
            });
        }

        const { data, error } = await supabase.rpc('unban_user', {
            p_admin_id: req.user.userId,
            p_user_id: req.params.id
        });

        if (error) {
            console.error('Error al desbloquear usuario:', error.message);

            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error('Error inesperado:', error);

        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
}

module.exports = {
    getUsers,
    banUser,
    unbanUser
};
