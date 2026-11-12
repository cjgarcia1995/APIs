
const supabase = require('../config/supabase');

// ==========================================
// CONSULTAR PERFIL DEL JUGADOR
// ==========================================

const getMyProfile = async (req, res) => {
    try {
        // Utilizamos el ID obtenido del JWT,
        // nunca uno enviado por el navegador.
        const userId = req.user.userId;

        // Consultar informacion del usuario
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, username, role, status, created_at')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Consultar estadisticas
        const { data: stats, error: statsError } = await supabase
            .from('player_stats')
            .select('credits, games_played, wins, equipped_skin_id')
            .eq('user_id', userId)
            .single();

        if (statsError || !stats) {
            return res.status(500).json({
                success: false,
                message: 'No se pudieron consultar las estadisticas'
            });
        }

        return res.status(200).json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                status: user.status,
                createdAt: user.created_at,
                credits: stats.credits,
                gamesPlayed: stats.games_played,
                wins: stats.wins,
                equippedSkinId: stats.equipped_skin_id
            }
        });

    } catch (error) {
        console.error('Error consultando perfil:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Error al consultar el perfil'
        });
    }
};

module.exports = {
    getMyProfile
};
