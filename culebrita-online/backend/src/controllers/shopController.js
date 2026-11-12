
const { z } = require('zod');
const supabase = require('../config/supabase');

// Validacion para comprar una skin
const buySkinSchema = z.object({
    skinId: z.string().uuid()
});

// Validacion para equipar una skin
const equipSkinSchema = z.object({
    skinId: z.string().uuid()
});

// Comprar una apariencia
const buySkin = async (req, res) => {
    try {
        const validation = buySkinSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos de compra invalidos'
            });
        }

        const userId = req.user.userId;
        const { skinId } = validation.data;

        const { data, error } = await supabase.rpc('purchase_skin', {
            p_user_id: userId,
            p_skin_id: skinId
        });

        if (error) {
            console.error('Error en compra:', error.message);

            return res.status(500).json({
                success: false,
                message: 'No se pudo procesar la compra'
            });
        }

        if (!data.success) {
            let statusCode = 400;

            if (data.message === 'Usuario no encontrado' ||
                data.message === 'La apariencia no existe') {
                statusCode = 404;
            }

            if (data.message === 'La cuenta se encuentra bloqueada') {
                statusCode = 403;
            }

            if (data.message === 'Ya tienes esta apariencia') {
                statusCode = 409;
            }

            return res.status(statusCode).json(data);
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error('Error interno en compra:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Error interno al procesar la compra'
        });
    }
};

// Equipar una apariencia
const equipSkin = async (req, res) => {
    try {
        const validation = equipSkinSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: 'Datos para equipar invalidos'
            });
        }

        const userId = req.user.userId;
        const { skinId } = validation.data;

        const { data, error } = await supabase.rpc('equip_skin', {
            p_user_id: userId,
            p_skin_id: skinId
        });

        if (error) {
            console.error('Error equipando skin:', error.message);

            return res.status(500).json({
                success: false,
                message: 'No se pudo equipar la apariencia'
            });
        }

        if (!data.success) {
            let statusCode = 400;

            if (data.message === 'Usuario no encontrado') {
                statusCode = 404;
            }

            if (data.message === 'La cuenta se encuentra bloqueada') {
                statusCode = 403;
            }

            if (data.message === 'No tienes esta apariencia') {
                statusCode = 403;
            }

            return res.status(statusCode).json(data);
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error('Error interno equipando skin:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Error interno al equipar la apariencia'
        });
    }
};

module.exports = {
    buySkin,
    equipSkin
};
