
// ==========================================
// PROYECTO: CULEBRITA ONLINE
// ARCHIVO: supabase.js
// FUNCION: Conectar Node.js con Supabase
// ==========================================

const { createClient } = require('@supabase/supabase-js');

// Obtenemos las credenciales del archivo .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Comprobamos que existan las credenciales
if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
        'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el archivo .env'
    );
}

// Creamos la conexión con Supabase
const supabase = createClient(
    supabaseUrl,
    supabaseSecretKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Exportamos la conexión para utilizarla en otros archivos
module.exports = supabase;
