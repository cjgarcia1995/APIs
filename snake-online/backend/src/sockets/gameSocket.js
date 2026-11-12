
// ==========================================
// PROYECTO: SNAKE ONLINE
// ARCHIVO: gameSocket.js
// FUNCION: Salas, partidas, colisiones y puntos
// ==========================================

const { randomUUID } = require('crypto');
const supabase = require('../config/supabase');

const MAX_PLAYERS = 10;

const MAP_WIDTH = 800;
const MAP_HEIGHT = 600;

const MOVEMENT_SPEED = 5;
const TICK_RATE = 100;

const FOOD_COUNT = 10;
const FOOD_POINTS = 10;
const FOOD_DISTANCE = 18;
const COLLISION_DISTANCE = 14;

const rooms = new Map();

// ==========================================
// DIRECCIONES
// ==========================================

const DIRECTIONS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
};

const OPPOSITE_DIRECTIONS = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left'
};

// ==========================================
// CREAR IDENTIFICADOR DE SALA
// ==========================================

function generateRoomId() {
    let roomId;

    do {
        roomId = 'room-' + Math.random().toString(36).substring(2, 8);
    } while (rooms.has(roomId));

    return roomId;
}

// ==========================================
// CREAR ALIMENTO
// ==========================================

function createFood() {
    return {
        id: Math.random().toString(36).substring(2, 10),
        x: Math.floor(Math.random() * (MAP_WIDTH - 80)) + 40,
        y: Math.floor(Math.random() * (MAP_HEIGHT - 80)) + 40
    };
}

// ==========================================
// OBTENER JUGADORES DE UNA SALA
// ==========================================

function getRoomPlayers(roomId) {
    const room = rooms.get(roomId);

    if (!room) return [];

    return Array.from(room.players.values()).map(player => ({
        username: player.username,
        x: player.x,
        y: player.y,
        direction: player.direction,
        body: player.body,
        score: player.score,
        alive: player.alive
    }));
}

// ==========================================
// OBTENER JUGADORES VIVOS
// ==========================================

function getAlivePlayers(room) {
    return Array.from(room.players.values())
        .filter(player => player.alive);
}

// ==========================================
// INFORMACION DE ESPERA
// ==========================================

function broadcastWaiting(roomId, io) {
    const room = rooms.get(roomId);

    if (!room || room.state !== 'waiting') return;

    io.to(roomId).emit('game:waiting', {
        roomId: roomId,
        players: getRoomPlayers(roomId),
        currentPlayers: room.players.size,
        requiredPlayers: 2
    });
}

// ==========================================
// CREAR PARTIDA
// ==========================================

function startGame(roomId, io) {
    const room = rooms.get(roomId);

    if (!room || room.state !== 'waiting') return;
    if (room.players.size < 2) return;

    room.state = 'playing';
    room.food = [];

    // Datos para registrar la partida en Supabase
    room.matchId = randomUUID();
    room.startedAt = new Date().toISOString();
    room.endReason = null;

    // Crear alimentos
    for (let i = 0; i < FOOD_COUNT; i++) {
        room.food.push(createFood());
    }

    // Reiniciar jugadores
    let position = 0;

    for (const player of room.players.values()) {
        const initialX = 150 + (position % 2) * 400;
        const initialY = 120 + Math.floor(position / 2) * 100;

        player.x = initialX;
        player.y = initialY;
        player.direction = 'right';
        player.score = 0;
        player.alive = true;
        player.abandoned = false;
        player.scoreReachedAt = null;

        player.body = [
            { x: initialX, y: initialY },
            { x: initialX - 10, y: initialY },
            { x: initialX - 20, y: initialY },
            { x: initialX - 30, y: initialY },
            { x: initialX - 40, y: initialY }
        ];

        position++;
    }

    console.log(`Partida iniciada en ${roomId}`);

    io.to(roomId).emit('game:started', {
        roomId: roomId,
        players: getRoomPlayers(roomId),
        food: room.food
    });

    startRoomMovement(roomId, io);
}

// ==========================================
// FINALIZAR PARTIDA
// ==========================================

// ==========================================
// FINALIZAR PARTIDA
// ==========================================

async function finishGame(roomId, io) {
    const room = rooms.get(roomId);

    if (!room || room.state !== 'playing') return;

    const alivePlayers = getAlivePlayers(room);

    // Evitar finalizar dos veces
    room.state = 'finished';

    if (room.interval) {
        clearInterval(room.interval);
        room.interval = null;
    }

    // Determinar ganador
    const winner = alivePlayers.length === 1
        ? {
            username: alivePlayers[0].username,
            score: alivePlayers[0].score
        }
        : null;

    // Determinar motivo de finalización
    const endReason = room.endReason ||
        (winner ? 'last_player_standing' : 'cancelled');

    // Preparar información de todos los participantes
    const playersData = Array.from(room.players.values()).map(player => ({
        user_id: player.userId,
        score: player.score,
        abandoned: player.abandoned === true,
        alive: player.alive,
        score_reached_at: player.scoreReachedAt
    }));

    let saved = false;
    let databaseResult = null;

    try {
        // Guardar partida y procesar recompensas en Supabase
        const { data, error } = await supabase.rpc('finalize_match', {
            p_match_id: room.matchId,
            p_players: playersData,
            p_end_reason: endReason,
            p_started_at: room.startedAt
        });

        if (error) {
            throw error;
        }

        if (!data || data.success !== true) {
            throw new Error('Supabase no confirmó el registro de la partida');
        }

        saved = true;
        databaseResult = data;

        console.log(
            `Partida ${room.matchId} registrada correctamente en Supabase`
        );

        console.log(
            `Recompensas habilitadas: ${data.reward_eligible}`
        );

    } catch (error) {
        console.error(
            `Error al guardar la partida ${room.matchId}:`,
            error.message
        );
    }

    console.log(
        winner
            ? `${winner.username} gano la partida ${roomId}`
            : `Partida ${roomId} finalizada sin ganador`
    );

    // Informar el resultado a los jugadores
    io.to(roomId).emit('game:finished', {
        winner: winner,
        players: getRoomPlayers(roomId),
        cancelled: winner === null,
        message: winner
            ? `${winner.username} es el ganador`
            : 'La partida termino sin ganador',
        matchId: room.matchId,
        saved: saved,
        rewardsProcessed: saved
            ? databaseResult.already_processed !== true
            : false
    });
}

// ==========================================
// COMPROBAR SI QUEDA UN SOLO JUGADOR
// ==========================================

function checkGameWinner(roomId, io) {
    const room = rooms.get(roomId);

    if (!room || room.state !== 'playing') return;

    const alivePlayers = getAlivePlayers(room);

    if (alivePlayers.length <= 1) {
        finishGame(roomId, io);
    }
}

// ==========================================
// ELIMINAR JUGADOR
// ==========================================

function eliminatePlayer(roomId, player, reason, io) {
    const room = rooms.get(roomId);

    if (!room || !player || !player.alive) return;

    player.alive = false;

    console.log(
        `${player.username} fue eliminado: ${reason}`
    );

    io.to(roomId).emit('game:playerEliminated', {
        username: player.username,
        reason: reason,
        players: getRoomPlayers(roomId)
    });

    checkGameWinner(roomId, io);
}

// ==========================================
// DISTANCIA ENTRE DOS PUNTOS
// ==========================================

function getDistance(pointA, pointB) {
    return Math.hypot(
        pointA.x - pointB.x,
        pointA.y - pointB.y
    );
}

// ==========================================
// DETECTAR COLISIONES
// ==========================================

function detectCollisions(roomId, io) {
    const room = rooms.get(roomId);

    if (!room || room.state !== 'playing') return;

    const players = getAlivePlayers(room);
    const eliminated = [];

    for (const player of players) {
        const head = {
            x: player.x,
            y: player.y
        };

        // Colision contra el propio cuerpo
        for (let i = 4; i < player.body.length; i++) {
            if (
                getDistance(head, player.body[i]) <
                COLLISION_DISTANCE
            ) {
                eliminated.push({
                    player,
                    reason: 'self_collision'
                });

                break;
            }
        }

        if (eliminated.some(item => item.player === player)) {
            continue;
        }

        // Colision contra otros jugadores
        for (const otherPlayer of players) {
            if (otherPlayer === player) continue;

            // Colision contra la cabeza de otro jugador
            if (
                getDistance(head, {
                    x: otherPlayer.x,
                    y: otherPlayer.y
                }) < COLLISION_DISTANCE
            ) {
                eliminated.push({
                    player,
                    reason: 'player_collision'
                });

                break;
            }

            // Colision contra el cuerpo de otro jugador
            for (let i = 1; i < otherPlayer.body.length; i++) {
                if (
                    getDistance(head, otherPlayer.body[i]) <
                    COLLISION_DISTANCE
                ) {
                    eliminated.push({
                        player,
                        reason: 'player_collision'
                    });

                    break;
                }
            }

            if (eliminated.some(item => item.player === player)) {
                break;
            }
        }
    }

    // Eliminar a todos los jugadores que chocaron
    // antes de determinar si existe un ganador.
    for (const item of eliminated) {
        item.player.alive = false;

        console.log(
            `${item.player.username} fue eliminado: ${item.reason}`
        );

        io.to(roomId).emit('game:playerEliminated', {
            username: item.player.username,
            reason: item.reason,
            players: getRoomPlayers(roomId)
        });
    }

    // Comprobar el ganador una sola vez
    checkGameWinner(roomId, io);
}

// ==========================================
// ACTUALIZAR MOVIMIENTO Y COMIDA
// ==========================================

function startRoomMovement(roomId, io) {
    const room = rooms.get(roomId);

    if (!room || room.interval) return;

    room.interval = setInterval(() => {
        if (room.state !== 'playing') return;

        const alivePlayers = getAlivePlayers(room);

        for (const player of alivePlayers) {
            const movement = DIRECTIONS[player.direction];

            player.x += movement.x * MOVEMENT_SPEED;
            player.y += movement.y * MOVEMENT_SPEED;

            // Atravesar los bordes
            if (player.x < 0) player.x = MAP_WIDTH;
            if (player.x > MAP_WIDTH) player.x = 0;
            if (player.y < 0) player.y = MAP_HEIGHT;
            if (player.y > MAP_HEIGHT) player.y = 0;

            // Actualizar cuerpo
            player.body.unshift({
                x: player.x,
                y: player.y
            });

            // Buscar comida
            const foodIndex = room.food.findIndex(food => {
                return getDistance(
                    { x: player.x, y: player.y },
                    food
                ) < FOOD_DISTANCE;
            });

            if (foodIndex !== -1) {
                room.food.splice(foodIndex, 1);

                player.score += FOOD_POINTS;
                player.scoreReachedAt = new Date().toISOString();

                // Crear nuevo alimento
                room.food.push(createFood());
            } else {
                player.body.pop();
            }
        }

        // Comprobar colisiones
        detectCollisions(roomId, io);

        if (room.state !== 'playing') return;

        // Enviar estado actualizado
        io.to(roomId).emit('game:state', {
            players: getRoomPlayers(roomId),
            food: room.food
        });

    }, TICK_RATE);
}

// ==========================================
// SALIDA Y DESCONEXION
// ==========================================

function leaveRoom(socket, io) {
    const roomId = socket.data.roomId;

    if (!roomId) return;

    const room = rooms.get(roomId);

    if (!room) {
        delete socket.data.roomId;
        return;
    }

    const player = room.players.get(socket.id);

    if (!player) {
        delete socket.data.roomId;
        return;
    }

    // Si esta esperando, simplemente quitar al jugador
    if (room.state === 'waiting') {
        room.players.delete(socket.id);

        socket.leave(roomId);
        delete socket.data.roomId;

        console.log(`${player.username} salio de ${roomId}`);

        if (room.players.size === 0) {
            rooms.delete(roomId);
            console.log(`Sala ${roomId} eliminada`);
        } else {
            broadcastWaiting(roomId, io);
        }

        return;
    }

    // Si la partida esta activa, abandonar significa eliminacion
    if (room.state === 'playing') {
        player.abandoned = true;
        room.endReason = 'disconnect';
        eliminatePlayer(
            roomId,
            player,
            'disconnect',
            io
        );

        socket.leave(roomId);
        delete socket.data.roomId;

        return;
    }

    // Si la partida ya termino, limpiar al jugador
    if (room.state === 'finished') {
        room.players.delete(socket.id);

        socket.leave(roomId);
        delete socket.data.roomId;

        if (room.players.size === 0) {
            rooms.delete(roomId);
        }
    }
}

// ==========================================
// LIMPIAR JUGADOR ANTERIOR
// ==========================================

function cleanPreviousPlayer(previousPlayer, roomId, room, io) {
    const previousSocket = io.sockets.sockets.get(
        previousPlayer.socketId
    );

    if (previousSocket) {
        leaveRoom(previousSocket, io);
        previousSocket.disconnect(true);
        return;
    }

    if (room.state === 'playing') {
        eliminatePlayer(
            roomId,
            previousPlayer,
            'disconnect',
            io
        );
    } else {
        room.players.delete(previousPlayer.socketId);

        if (room.state === 'waiting') {
            broadcastWaiting(roomId, io);
        }
    }

    if (room.players.size === 0) {
        if (room.interval) {
            clearInterval(room.interval);
        }

        rooms.delete(roomId);
    }
}

// ==========================================
// REGISTRAR EVENTOS MULTIJUGADOR
// ==========================================

function registerGameSocket(io) {
    io.on('connection', (socket) => {
        const user = socket.data.user;

        // ==========================================
        // UNIRSE A PARTIDA
        // ==========================================

        socket.on('game:join', () => {
            if (socket.data.roomId) {
                return socket.emit('game:error', {
                    message: 'Ya estas dentro de una partida'
                });
            }

            // Evitar duplicados de la misma cuenta
            for (const [roomId, room] of rooms.entries()) {
                const previousPlayer = Array.from(room.players.values())
                    .find(player => player.userId === user.userId);

                if (previousPlayer) {
                    cleanPreviousPlayer(
                        previousPlayer,
                        roomId,
                        room,
                        io
                    );
                }
            }

            // Buscar exclusivamente salas en espera
            let selectedRoom = null;

            for (const [roomId, room] of rooms.entries()) {
                if (
                    room.state === 'waiting' &&
                    room.players.size < MAX_PLAYERS
                ) {
                    selectedRoom = roomId;
                    break;
                }
            }

            // Crear sala nueva
            if (!selectedRoom) {
                selectedRoom = generateRoomId();

                rooms.set(selectedRoom, {
                    players: new Map(),
                    food: [],
                    state: 'waiting',
                    interval: null
                });
            }

            const room = rooms.get(selectedRoom);

            // Crear jugador
            const player = {
                userId: user.userId,
                username: user.username,
                socketId: socket.id,
                x: 100,
                y: 100,
                direction: 'right',
                score: 0,
                alive: true,
                body: []
            };

            room.players.set(socket.id, player);

            socket.data.roomId = selectedRoom;
            socket.join(selectedRoom);

            console.log(
                `${user.username} entro a la sala ${selectedRoom}`
            );

            // Confirmar entrada
            socket.emit('game:joined', {
                success: true,
                roomId: selectedRoom,
                state: room.state,
                players: getRoomPlayers(selectedRoom),
                food: room.food
            });

            // Comenzar al alcanzar dos jugadores
            if (room.players.size >= 2) {
                startGame(selectedRoom, io);
            } else {
                broadcastWaiting(selectedRoom, io);
            }
        });

        // ==========================================
        // RECIBIR DIRECCION
        // ==========================================

        socket.on('game:input', (data) => {
            const roomId = socket.data.roomId;

            if (!roomId || !data || typeof data !== 'object') {
                return;
            }

            const room = rooms.get(roomId);

            if (!room || room.state !== 'playing') return;

            const player = room.players.get(socket.id);

            if (!player || !player.alive) return;

            const newDirection = data.direction;

            if (!Object.prototype.hasOwnProperty.call(
                DIRECTIONS,
                newDirection
            )) {
                return socket.emit('game:error', {
                    message: 'Direccion de movimiento invalida'
                });
            }

            // Evitar giro de 180 grados
            if (
                OPPOSITE_DIRECTIONS[player.direction] === newDirection
            ) {
                return;
            }

            player.direction = newDirection;
        });

        // ==========================================
        // SALIR DE PARTIDA
        // ==========================================

        socket.on('game:leave', () => {
            leaveRoom(socket, io);
        });

        // ==========================================
        // DESCONECTAR JUGADOR
        // ==========================================

        socket.on('disconnect', () => {
            leaveRoom(socket, io);
        });
    });
}

// ==========================================
// EXPORTAR
// ==========================================

module.exports = {
    registerGameSocket
};
