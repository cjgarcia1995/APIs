
import Phaser from 'phaser';
import { io } from 'socket.io-client';

// ==========================================
// DATOS DE LA SESION DEL JUGADOR
// ==========================================

let gameSession = {
    token: null,
    username: null
};

export function setGameSession(token, username) {
    gameSession.token = token;
    gameSession.username = username;
}

// ==========================================
// ESCENARIO PRINCIPAL
// ==========================================

export default class GameScene extends Phaser.Scene {

    constructor() {
        super('GameScene');
    }

    create() {

        this.username = gameSession.username;

        this.players = [];
        this.food = [];

        this.playerLabels = new Map();

        this.socket = null;

        this.isPlaying = false;
        this.isEliminated = false;
        this.gameFinished = false;

        // ==========================================
        // CREAR MAPA
        // ==========================================

        this.add.rectangle(
            400, 300, 800, 600, 0x152238
        );

        const grid = this.add.graphics();

        grid.lineStyle(1, 0x263750, 0.5);

        for (let x = 0; x <= 800; x += 40) {
            grid.lineBetween(x, 0, x, 600);
        }

        for (let y = 0; y <= 600; y += 40) {
            grid.lineBetween(0, y, 800, y);
        }

        // Graficos de comida y culebritas
        this.foodGraphics = this.add.graphics();
        this.snakeGraphics = this.add.graphics();

        // ==========================================
        // MENSAJE DE ESTADO
        // ==========================================

        this.statusText = this.add.text(
            15,
            15,
            'Conectando con el servidor...',
            {
                fontSize: '16px',
                color: '#ffffff'
            }
        );

        this.statusText.setDepth(10);

        // ==========================================
        // PANTALLA DE ESPERA
        // ==========================================

        this.waitingBackground = this.add.rectangle(
            400,
            300,
            380,
            150,
            0x101827,
            0.95
        );

        this.waitingBackground.setStrokeStyle(
            2,
            0x3399ff
        );

        this.waitingBackground.setDepth(20);

        this.waitingText = this.add.text(
            400,
            300,
            'Esperando jugadores...',
            {
                fontSize: '24px',
                color: '#ffffff',
                align: 'center',
                fontFamily: 'Arial'
            }
        );

        this.waitingText.setOrigin(0.5);
        this.waitingText.setDepth(21);

        // ==========================================
        // PANTALLA DE RESULTADOS
        // ==========================================

        this.finishedBackground = this.add.rectangle(
            400,
            300,
            440,
            190,
            0x101827,
            0.97
        );

        this.finishedBackground.setStrokeStyle(
            2,
            0xffcc33
        );

        this.finishedBackground.setDepth(30);

        this.finishedText = this.add.text(
            400,
            300,
            '',
            {
                fontSize: '23px',
                color: '#ffffff',
                align: 'center',
                fontFamily: 'Arial',
                wordWrap: {
                    width: 400
                }
            }
        );

        this.finishedText.setOrigin(0.5);
        this.finishedText.setDepth(31);

        // Ocultar pantallas inicialmente
        this.waitingBackground.setVisible(false);
        this.waitingText.setVisible(false);

        this.finishedBackground.setVisible(false);
        this.finishedText.setVisible(false);

        // ==========================================
        // CONFIGURAR TECLADO
        // ==========================================

        this.cursors = this.input.keyboard.createCursorKeys();

        this.keys = this.input.keyboard.addKeys('W,A,S,D');

        // ==========================================
        // CONECTAR CON SOCKET.IO
        // ==========================================

        this.socket = io('https://localhost:3000', {
            auth: {
                token: gameSession.token
            },
            reconnection: true
        });

        this.socket.on('connect', () => {

            this.statusText.setText(
                'Conectado. Buscando partida...'
            );

            this.socket.emit('game:join');
        });

        // ==========================================
        // ENTRADA A LA SALA
        // ==========================================

        this.socket.on('game:joined', (data) => {

            this.players = data.players || [];

            this.food = data.food || [];

            this.statusText.setText(
                `Sala: ${data.roomId}`
            );

            if (data.state === 'waiting') {
                this.showWaiting(this.players.length);
            }
        });

        // ==========================================
        // ESPERAR A OTROS JUGADORES
        // ==========================================

        this.socket.on('game:waiting', (data) => {

            this.players = data.players || [];

            this.food = [];

            this.isPlaying = false;

            this.showWaiting(data.currentPlayers);
        });

        // ==========================================
        // PARTIDA INICIADA
        // ==========================================

        this.socket.on('game:started', (data) => {

            this.players = data.players || [];

            this.food = data.food || [];

            this.isPlaying = true;

            this.isEliminated = false;

            this.gameFinished = false;

            this.waitingBackground.setVisible(false);
            this.waitingText.setVisible(false);

            this.statusText.setText(
                '¡Partida iniciada! Usa WASD o las flechas para moverte.'
            );
        });

        // ==========================================
        // JUGADOR ELIMINADO
        // ==========================================

        this.socket.on('game:playerEliminated', (data) => {

            this.players = data.players || [];

            console.log(
                `${data.username} fue eliminado: ${data.reason}`
            );

            if (data.username === this.username) {

                this.isEliminated = true;

                this.statusText.setText(
                    '¡Has sido eliminado! Espera el resultado de la partida.'
                );

            } else {

                this.statusText.setText(
                    `${data.username} ha sido eliminado.`
                );
            }
        });

        // ==========================================
        // PARTIDA FINALIZADA
        // ==========================================

        this.socket.on('game:finished', (data) => {

            this.players = data.players || [];

            this.isPlaying = false;

            this.gameFinished = true;

            this.food = [];

            let resultMessage = '';

            if (data.winner) {

                if (data.winner.username === this.username) {

                    resultMessage =
                        `¡FELICIDADES!\n\nHas ganado la partida.\n\nPuntuación: ${data.winner.score}`;

                } else {

                    resultMessage =
                        `PARTIDA FINALIZADA\n\nGanador: ${data.winner.username}\n\nPuntuación: ${data.winner.score}`;
                }

            } else {

                resultMessage =
                    'PARTIDA FINALIZADA\n\nNo hubo ganador.';
            }

            this.finishedText.setText(resultMessage);

            this.finishedBackground.setVisible(true);
            this.finishedText.setVisible(true);

            this.statusText.setText(
                'Partida terminada. Usa el botón para volver al menú.'
            );
        });

        // ==========================================
        // ACTUALIZAR ESTADO DEL JUEGO
        // ==========================================

        this.socket.on('game:state', (data) => {

            this.players = data.players || [];

            this.food = data.food || [];
        });

        // ==========================================
        // ERRORES
        // ==========================================

        this.socket.on('game:error', (data) => {

            this.statusText.setText(data.message);
        });

        this.socket.on('connect_error', (error) => {

            this.statusText.setText(
                `Error de conexion: ${error.message}`
            );
        });

        // ==========================================
        // LIMPIAR CONEXION
        // ==========================================

        this.events.once('shutdown', () => {
            this.disconnectFromServer();
        });

        this.events.once('destroy', () => {
            this.disconnectFromServer();
        });
    }

    // ==========================================
    // MOSTRAR PANTALLA DE ESPERA
    // ==========================================

    showWaiting(currentPlayers) {

        this.waitingText.setText(
            `Esperando jugadores...\n\n${currentPlayers} de 2 jugadores`
        );

        this.waitingBackground.setVisible(true);
        this.waitingText.setVisible(true);

        this.statusText.setText(
            'Esperando que se conecte otro jugador...'
        );
    }

    // ==========================================
    // ACTUALIZAR JUEGO
    // ==========================================

    update() {

        if (!this.socket || !this.socket.connected) {
            return;
        }

        // No permitir movimiento durante la espera,
        // despues de ser eliminado o al finalizar.
        if (
            !this.isPlaying ||
            this.isEliminated ||
            this.gameFinished
        ) {

            this.drawFood();
            this.drawPlayers();

            return;
        }

        if (
            Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
            Phaser.Input.Keyboard.JustDown(this.keys.W)
        ) {
            this.sendDirection('up');
        }

        if (
            Phaser.Input.Keyboard.JustDown(this.cursors.down) ||
            Phaser.Input.Keyboard.JustDown(this.keys.S)
        ) {
            this.sendDirection('down');
        }

        if (
            Phaser.Input.Keyboard.JustDown(this.cursors.left) ||
            Phaser.Input.Keyboard.JustDown(this.keys.A)
        ) {
            this.sendDirection('left');
        }

        if (
            Phaser.Input.Keyboard.JustDown(this.cursors.right) ||
            Phaser.Input.Keyboard.JustDown(this.keys.D)
        ) {
            this.sendDirection('right');
        }

        this.drawFood();

        this.drawPlayers();
    }

    // ==========================================
    // ENVIAR DIRECCION
    // ==========================================

    sendDirection(direction) {

        this.socket.emit('game:input', {
            direction: direction
        });
    }

    // ==========================================
    // DIBUJAR COMIDA
    // ==========================================

    drawFood() {

        this.foodGraphics.clear();

        this.food.forEach((food) => {

            // Brillo exterior
            this.foodGraphics.fillStyle(0xffcc33, 0.25);

            this.foodGraphics.fillCircle(
                food.x,
                food.y,
                10
            );

            // Alimento central
            this.foodGraphics.fillStyle(0xffcc33, 1);

            this.foodGraphics.fillCircle(
                food.x,
                food.y,
                5
            );
        });
    }

    // ==========================================
    // DIBUJAR CULEBRITAS Y PUNTUACIONES
    // ==========================================

    drawPlayers() {

        this.snakeGraphics.clear();

        const activePlayers = new Set();

        this.players.forEach((player) => {

            // No dibujar jugadores eliminados
            if (player.alive === false) {
                return;
            }

            const color = player.username === this.username
                ? 0x19d18b
                : 0x3399ff;

            // Dibujar cuerpo
            this.snakeGraphics.fillStyle(color, 1);

            player.body.forEach((segment, index) => {

                const radius = index === 0 ? 11 : 9;

                this.snakeGraphics.fillCircle(
                    segment.x,
                    segment.y,
                    radius
                );
            });

            // Dibujar cabeza
            this.snakeGraphics.fillStyle(0xffffff, 1);

            this.snakeGraphics.fillCircle(
                player.x,
                player.y,
                3
            );

            // ==========================================
            // NICKNAME Y PUNTUACION
            // ==========================================

            activePlayers.add(player.username);

            let label = this.playerLabels.get(player.username);

            if (!label) {

                label = this.add.text(
                    player.x,
                    player.y - 20,
                    '',
                    {
                        fontFamily: 'Arial',
                        fontSize: '13px',
                        color: '#ffffff',
                        stroke: '#101827',
                        strokeThickness: 4,
                        align: 'center'
                    }
                );

                label.setOrigin(0.5, 1);

                label.setDepth(10);

                this.playerLabels.set(
                    player.username,
                    label
                );
            }

            label.setText(
                `${player.username} | ${player.score || 0} pts`
            );

            label.setPosition(
                player.x,
                player.y - 20
            );
        });

        // Eliminar nombres de jugadores que ya no estan activos
        for (const [username, label] of this.playerLabels) {

            if (!activePlayers.has(username)) {

                label.destroy();

                this.playerLabels.delete(username);
            }
        }
    }

    // ==========================================
    // DESCONECTAR DEL SERVIDOR
    // ==========================================

    disconnectFromServer() {

        if (this.socket) {

            if (this.socket.connected) {
                this.socket.emit('game:leave');
            }

            this.socket.disconnect();

            this.socket = null;
        }
    }
}
