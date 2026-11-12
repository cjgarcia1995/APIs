
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const supabase = require('../config/supabase');

// Validaciones de los datos recibidos
const registerSchema = z.object({
    username: z.string().trim().min(3).max(20)
        .regex(/^[a-zA-Z0-9_]+$/),

    password: z.string().min(8).max(72)
        .regex(/[A-Z]/, 'Debe contener una mayuscula')
        .regex(/[a-z]/, 'Debe contener una minuscula')
        .regex(/[0-9]/, 'Debe contener un numero')
        .regex(/[^A-Za-z0-9]/, 'Debe contener un caracter especial'),

    confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
    message: 'Las contrasenas no coinciden',
    path: ['confirmPassword']
});

// ==========================================
// REGISTRO DE USUARIOS
// ==========================================

const register = async (req, res) => {
    let createdUserId = null;

    try {
        // 1. Validar los datos recibidos
        const validation = registerSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: 'Los datos del registro no son validos',
                errors: validation.error.issues.map(issue => ({
                    field: issue.path[0],
                    message: issue.message
                }))
            });
        }

        const { username, password } = validation.data;

        // 2. Buscar la apariencia gratuita
        const { data: defaultSkin, error: skinError } =
            await supabase
                .from('skins')
                .select('id')
                .eq('name', 'Verde clásico')
                .eq('is_default', true)
                .single();

        if (skinError || !defaultSkin) {
            console.error('Error buscando apariencia inicial:', skinError);

            return res.status(500).json({
                success: false,
                message: 'No se pudo preparar la apariencia inicial'
            });
        }

        // 3. Cifrar la contraseña
        const passwordHash = await bcrypt.hash(password, 12);

        // 4. Crear el usuario
        const { data: newUser, error: userError } =
            await supabase
                .from('users')
                .insert({
                    username,
                    password_hash: passwordHash
                })
                .select('id, username, role, created_at')
                .single();

        if (userError) {
            if (userError.code === '23505') {
                return res.status(409).json({
                    success: false,
                    message: 'Ese nombre de usuario ya esta registrado'
                });
            }

            console.error('Error creando usuario:', userError);

            return res.status(500).json({
                success: false,
                message: 'No se pudo crear el usuario'
            });
        }

        createdUserId = newUser.id;

        // 5. Entregar la apariencia gratuita
        const { error: ownershipError } = await supabase
            .from('user_skins')
            .insert({
                user_id: newUser.id,
                skin_id: defaultSkin.id
            });

        if (ownershipError) {
            throw ownershipError;
        }

        // 6. Crear las estadisticas del jugador
        const { error: statsError } = await supabase
            .from('player_stats')
            .insert({
                user_id: newUser.id,
                credits: 0,
                games_played: 0,
                wins: 0,
                equipped_skin_id: defaultSkin.id
            });

        if (statsError) {
            throw statsError;
        }

        // 7. Crear el token de autenticacion
        const token = jwt.sign(
            {
                userId: newUser.id,
                role: newUser.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '2h'
            }
        );

        // 8. Responder al cliente
        return res.status(201).json({
            success: true,
            message: 'Usuario registrado correctamente',
            token,
            user: {
                id: newUser.id,
                username: newUser.username,
                role: newUser.role,
                credits: 0,
                equippedSkin: 'Verde clásico'
            }
        });

    } catch (error) {
        console.error('Error durante el registro:', error.message);

        // Si algo falla despues de crear el usuario,
        // eliminamos el registro incompleto.
        if (createdUserId) {
            const { error: cleanupError } = await supabase
                .from('users')
                .delete()
                .eq('id', createdUserId);

            if (cleanupError) {
                console.error('Error limpiando usuario incompleto:', cleanupError);
            }
        }

        return res.status(500).json({
            success: false,
            message: 'Ocurrio un error durante el registro'
        });
    }
};


// ==========================================
// INICIO DE SESION
// ==========================================

const login = async (req, res) => {
    try {
        // 1. Validar los datos recibidos
        const loginSchema = z.object({
            username: z.string().trim().min(3).max(20),
            password: z.string().min(1).max(72)
        });

        const validation = loginSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: 'Debes ingresar un usuario y una contrasena validos'
            });
        }

        const { username, password } = validation.data;

        // 2. Buscar el usuario en Supabase
        const { data: user, error } = await supabase
            .from('users')
            .select('id, username, password_hash, role, status')
            .ilike('username', username)
            .maybeSingle();

        if (error) {
            console.error('Error buscando usuario:', error.message);

            return res.status(500).json({
                success: false,
                message: 'No se pudo procesar el inicio de sesion'
            });
        }

        // 3. Comprobar que el usuario exista
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario o contrasena incorrectos'
            });
        }

        // 4. Comprobar que la cuenta no este suspendida
        if (user.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Esta cuenta se encuentra suspendida'
            });
        }

        // 5. Comparar la contrasena con su hash
        const passwordCorrect = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordCorrect) {
            return res.status(401).json({
                success: false,
                message: 'credenciales incorrectas'
            });
        }

        // 6. Consultar las estadisticas del jugador
        const { data: stats, error: statsError } = await supabase
            .from('player_stats')
            .select('credits, equipped_skin_id')
            .eq('user_id', user.id)
            .single();

        if (statsError || !stats) {
            console.error('Error consultando estadisticas:', statsError);

            return res.status(500).json({
                success: false,
                message: 'No se pudieron cargar los datos del jugador'
            });
        }

        // 7. Generar el token JWT
        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '2h'
            }
        );

        // 8. Enviar la respuesta
        return res.status(200).json({
            success: true,
            message: 'Inicio de sesion correcto',
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                credits: stats.credits,
                equippedSkinId: stats.equipped_skin_id
            }
        });

    } catch (error) {
        console.error('Error durante el inicio de sesion:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Ocurrio un error durante el inicio de sesion'
        });
    }
};


// Exportamos las funciones del controlador
module.exports = {
    register,
    login
};
