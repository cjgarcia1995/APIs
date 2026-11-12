
const supabase = require('../config/supabase');

const getLeaderboard = async (req, res) => {
    try {
        // Obtener los 10 mejores jugadores
        const { data: stats, error: statsError } = await supabase
            .from('player_stats')
            .select('user_id, credits, wins, games_played')
            .order('wins', { ascending: false })
            .order('credits', { ascending: false })
            .limit(10);

        if (statsError) {
            console.error('Error consultando clasificacion:', statsError.message);

            return res.status(500).json({
                success: false,
                message: 'No se pudo obtener la clasificacion'
            });
        }

        if (stats.length === 0) {
            return res.status(200).json({
                success: true,
                total: 0,
                leaderboard: []
            });
        }

        // Obtener los nombres de los jugadores
        const userIds = stats.map(player => player.user_id);

        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, username')
            .in('id', userIds)
            .eq('status', 'active');

        if (usersError) {
            console.error('Error consultando jugadores:', usersError.message);

            return res.status(500).json({
                success: false,
                message: 'No se pudieron obtener los jugadores'
            });
        }

        // Relacionar las estadisticas con los nombres
        const leaderboard = stats
            .filter(player => users.some(user => user.id === player.user_id))
            .map(player => {
                const user = users.find(
                    item => item.id === player.user_id
                );

                return {
                    username: user.username,
                    wins: player.wins,
                    gamesPlayed: player.games_played,
                    credits: player.credits
                };
            })
            .map((player, index) => ({
                position: index + 1,
                ...player
            }));

        return res.status(200).json({
            success: true,
            total: leaderboard.length,
            leaderboard
        });

    } catch (error) {
        console.error('Error interno en clasificacion:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Error interno al consultar la clasificacion'
        });
    }
};

module.exports = {
    getLeaderboard
};
