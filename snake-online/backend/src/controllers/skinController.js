
const supabase = require('../config/supabase');

const getSkins = async (req, res) => {
    try {
        const { data: skins, error } = await supabase
            .from('skins')
            .select('id, name, price, image_key, is_default')
            .order('price', { ascending: true });

        if (error) {
            console.error('Error consultando skins:', error.message);

            return res.status(500).json({
                success: false,
                message: 'No se pudo obtener el catalogo de apariencias'
            });
        }

        return res.status(200).json({
            success: true,
            total: skins.length,
            skins
        });

    } catch (error) {
        console.error('Error interno:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Error interno al consultar las apariencias'
        });
    }
};

module.exports = {
    getSkins
};
