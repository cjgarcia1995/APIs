
// ==========================================
// PROYECTO: SNAKE ONLINE
// ARCHIVO: server.js
// FUNCION: Servidor principal del Backend
// ==========================================

// Importamos las dependencias
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const https = require('https');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

// Primero cargamos las variables del archivo .env
dotenv.config();

// Importamos las conexiones y módulos que necesitan .env
const supabase = require('./config/supabase');
const { registerGameSocket } = require('./sockets/gameSocket');

// Importamos las rutas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const skinRoutes = require('./routes/skinRoutes');
const shopRoutes = require('./routes/shopRoutes');
const gameRoutes = require('./routes/gameRoutes');
const adminRoutes = require('./routes/adminRoutes');


// Creamos la aplicacion Express
const app = express();

// ==========================================
// DOCUMENTACION SWAGGER
// ==========================================

const swaggerDocument = YAML.load(
    path.join(__dirname, 'docs', 'swagger.yaml')
);

app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument)
);

// Puerto del servidor
const PORT = process.env.PORT || 3000;

// Direccion permitida para el frontend
const FRONTEND_URL =
    process.env.FRONTEND_URL || 'http://localhost:5173';

// ==========================================
// CONFIGURACIONES DE SEGURIDAD
// ==========================================

app.use(helmet());

app.use(cors({
    origin: FRONTEND_URL
}));

app.use(express.json({ limit: '10kb' }));

// ==========================================
// RUTAS DE LA API
// ==========================================

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/skins', skinRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/admin', adminRoutes);

// ==========================================
// RUTA DE PRUEBA DEL SERVIDOR
// ==========================================

app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'El servidor de Snake Online funciona correctamente',
        status: 'ONLINE',
        timestamp: new Date().toISOString()
    });
});

// ==========================================
// PRUEBA DE CONEXION CON SUPABASE
// ==========================================

app.get('/api/test-db', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('skins')
            .select('id, name, price')
            .limit(10);

        if (error) {
            console.error('Error de Supabase:', error.message);

            return res.status(500).json({
                success: false,
                message: 'No se pudo consultar la base de datos'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Conexion con Supabase establecida correctamente',
            total: data.length,
            skins: data
        });

    } catch (error) {
        console.error('Error de conexion:', error.message);

        res.status(500).json({
            success: false,
            message: 'Error interno al conectar con Supabase'
        });
    }
});

// ==========================================
// CREAMOS EL SERVIDOR HTTPS
// ==========================================

// Express atendera las solicitudes HTTPS
const httpServer = https.createServer(
    {
        key: fs.readFileSync(
            path.join(__dirname, '..', 'certs', 'localhost+2-key.pem')
        ),
        cert: fs.readFileSync(
            path.join(__dirname, '..', 'certs', 'localhost+2.pem')
        )
    },
    app
);

// Socket.IO utilizara el mismo servidor
const io = new Server(httpServer, {
    cors: {
        origin: FRONTEND_URL,
        methods: ['GET', 'POST']
    }
});

// ==========================================
// AUTENTICACION DE SOCKET.IO CON JWT
// ==========================================

io.use(async (socket, next) => {
    try {
        // Recibimos el token enviado por el jugador
        let token = socket.handshake.auth.token;

        // Comprobamos que exista
        if (!token) {
            return next(new Error('Debes iniciar sesion'));
        }

        // Aceptamos tambien el formato Bearer
        if (token.startsWith('Bearer ')) {
            token = token.slice(7);
        }

        // Verificamos que el token sea valido
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Consultamos el usuario directamente en Supabase
        const { data: user, error } = await supabase
            .from('users')
            .select('id, username, role, status')
            .eq('id', decoded.userId)
            .single();

        if (error || !user) {
            return next(new Error('Usuario no encontrado'));
        }

        // Comprobamos que la cuenta este activa
        if (user.status !== 'active') {
            return next(new Error('Tu cuenta se encuentra bloqueada'));
        }

        // Guardamos los datos verificados en la conexion
        socket.data.user = {
            userId: user.id,
            username: user.username,
            role: user.role
        };

        next();

    } catch (error) {
        console.error('Error de autenticacion Socket.IO:', error.message);
        next(new Error('Token invalido o expirado'));
    }
});

// ==========================================
// ACTIVAMOS LAS SALAS MULTIJUGADOR
// ==========================================

registerGameSocket(io);

// ==========================================
// RUTA PARA DIRECCIONES INEXISTENTES
// ==========================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'La ruta solicitada no existe'
    });
});

// ==========================================
// INICIAMOS EL SERVIDOR
// ==========================================

httpServer.listen(PORT, () => {
    console.log('====================================');
    console.log(' SNAKE ONLINE - BACKEND');
    console.log('====================================');
    console.log(`Servidor ejecutandose en puerto ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`API: http://localhost:${PORT}/api/health`);
    console.log('Socket.IO: habilitado');
    console.log('====================================');
});
