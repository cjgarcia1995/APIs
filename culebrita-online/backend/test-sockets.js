
const { io } = require('socket.io-client');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function preguntar(mensaje) {
    return new Promise((resolve) => {
        rl.question(mensaje, resolve);
    });
}

function conectarJugador(nombre, token) {
    return new Promise((resolve, reject) => {

        const socket = io('http://localhost:3000', {
            auth: { token },
            reconnection: false,
            timeout: 5000
        });

        socket.on('connect', () => {
            console.log(`\n${nombre} conectado.`);
            resolve(socket);
        });

        socket.on('connect_error', (error) => {
            socket.disconnect();
            reject(error);
        });
    });
}

function entrarSala(socket) {
    return new Promise((resolve) => {
        socket.once('game:joined', resolve);
        socket.emit('game:join');
    });
}

async function iniciarPrueba() {

    let jugador1;
    let jugador2;

    try {

        console.log('====================================');
        console.log(' PRUEBA DE MOVIMIENTO MULTIJUGADOR');
        console.log('====================================');

        const token1 = (await preguntar(
            'Token de jugador_prueba: '
        )).trim();

        jugador1 = await conectarJugador(
            'jugador_prueba',
            token1
        );

        const token2 = (await preguntar(
            '\nToken de jugador_secundario: '
        )).trim();

        jugador2 = await conectarJugador(
            'jugador_secundario',
            token2
        );

        // Ambos jugadores entran a una sala
        const sala1 = await entrarSala(jugador1);
        const sala2 = await entrarSala(jugador2);

        console.log('\nAmbos jugadores entraron a la sala.');
        console.log('Sala:', sala1.roomId);

        console.log('\nPosiciones iniciales:');
        console.log(sala2.players);

        // Escuchar actualizaciones de ambos jugadores
        jugador1.on('game:state', (data) => {

            console.log('\n--- ACTUALIZACION RECIBIDA ---');

            data.players.forEach((player) => {
                console.log(
                    `${player.username}: X=${player.x}, Y=${player.y}, Direccion=${player.direction}`
                );
            });
        });

        // Esperar unos segundos para observar movimiento
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('\nCambiando direccion del jugador 1...');

        // El jugador 1 cambia de derecha a abajo
        jugador1.emit('game:input', {
            direction: 'down'
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('\n====================================');
        console.log(' PRUEBA DE MOVIMIENTO COMPLETADA');
        console.log('====================================');

        await preguntar(
            '\nPresiona ENTER para desconectar a ambos jugadores...'
        );

    } catch (error) {

        console.error('\nError durante la prueba:');
        console.error(error.message);

    } finally {

        if (jugador1) jugador1.disconnect();
        if (jugador2) jugador2.disconnect();

        console.log('\nConexiones cerradas.');

        rl.close();
    }
}

iniciarPrueba();
