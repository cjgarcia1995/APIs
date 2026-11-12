
import './style.css';

import Phaser from 'phaser';
import GameScene, { setGameSession } from './scenes/GameScene.js';

import {
  loginUser,
  registerUser,
  getMyProfile
} from './services/api.js';

const app = document.querySelector('#app');

let currentToken = sessionStorage.getItem('token');
let gameInstance = null;

// ==========================================
// PANTALLA DE INICIO
// ==========================================

function showLogin() {

  app.innerHTML = `
        <main class="auth-container">
            <section class="auth-card">

                <div class="logo">🐍</div>

                <h1>SNAKE ONLINE</h1>

                <p class="subtitle">
                    ¡Compite, crece y domina la arena!
                </p>

                <div class="tabs">
                    <button id="loginTab" class="tab active">
                        Iniciar sesión
                    </button>

                    <button id="registerTab" class="tab">
                        Registrarse
                    </button>
                </div>

                <form id="authForm">

                    <label>Nombre de usuario</label>

                    <input
                        id="username"
                        type="text"
                        placeholder="Tu nombre de usuario"
                        minlength="3"
                        maxlength="20"
                        required
                    />

                    <label>Contraseña</label>

                    <input
                        id="password"
                        type="password"
                        placeholder="Tu contraseña"
                        required
                    />

                    <div id="confirmContainer" class="hidden">
                        <label>Confirmar contraseña</label>

                        <input
                            id="confirmPassword"
                            type="password"
                            placeholder="Repite tu contraseña"
                        />
                    </div>

                    <button id="submitButton" class="primary-button">
                        Iniciar sesión
                    </button>

                </form>

                <p id="message" class="message"></p>

            </section>
        </main>
    `;

  let registerMode = false;

  const form = document.querySelector('#authForm');
  const loginTab = document.querySelector('#loginTab');
  const registerTab = document.querySelector('#registerTab');
  const confirmContainer = document.querySelector('#confirmContainer');
  const submitButton = document.querySelector('#submitButton');
  const message = document.querySelector('#message');

  loginTab.addEventListener('click', () => {
    registerMode = false;

    loginTab.classList.add('active');
    registerTab.classList.remove('active');

    confirmContainer.classList.add('hidden');
    submitButton.textContent = 'Iniciar sesión';

    message.textContent = '';
  });

  registerTab.addEventListener('click', () => {
    registerMode = true;

    registerTab.classList.add('active');
    loginTab.classList.remove('active');

    confirmContainer.classList.remove('hidden');
    submitButton.textContent = 'Crear cuenta';

    message.textContent = '';
  });

  form.addEventListener('submit', async (event) => {

    event.preventDefault();

    const username = document.querySelector('#username').value.trim();
    const password = document.querySelector('#password').value;
    const confirmPassword = document.querySelector('#confirmPassword')?.value;

    submitButton.disabled = true;
    submitButton.textContent = 'Procesando...';

    message.textContent = '';

    try {

      let result;

      if (registerMode) {

        result = await registerUser(
          username,
          password,
          confirmPassword
        );

      } else {

        result = await loginUser(
          username,
          password
        );
      }

      const token =
        result.token ||
        result.accessToken ||
        result.data?.token;

      if (!token) {
        throw new Error(
          'La respuesta del servidor no contiene el token de acceso.'
        );
      }

      currentToken = token;

      sessionStorage.setItem('token', token);

      await showGameMenu();

    } catch (error) {

      message.textContent = error.message;
      message.className = 'message error';

    } finally {

      submitButton.disabled = false;

      submitButton.textContent = registerMode
        ? 'Crear cuenta'
        : 'Iniciar sesión';
    }
  });
}

// ==========================================
// MENU PRINCIPAL DEL JUGADOR
// ==========================================

async function showGameMenu() {

  try {

    const profile = await getMyProfile(currentToken);

    const player = profile.user || profile.data || profile;

    const username = player.username || 'Jugador';

    app.innerHTML = `
            <main class="menu-container">

                <header class="top-bar">
                    <h2>🐍 SNAKE ONLINE</h2>

                    <button id="logoutButton" class="secondary-button">
                        Cerrar sesión
                    </button>
                </header>

                <section class="welcome-card">

                    <div class="logo">🐍</div>

                    <h1>¡Bienvenido, ${escapeHTML(username)}!</h1>

                    <p>Tu próxima partida está esperando.</p>

                    <div class="player-info">
                        <span>Jugador: ${escapeHTML(username)}</span>
                        <span>Créditos: ${Number(player.credits ?? player.stats?.credits ?? 0)}</span>
                    </div>

                    <button id="playButton" class="primary-button">
                        JUGAR AHORA
                    </button>

                </section>

                <section class="menu-options">

                    <article class="option-card">
                        <h3>🏆 Clasificación</h3>
                        <p>Compite por el primer lugar.</p>
                    </article>

                    <article class="option-card">
                        <h3>🛒 Tienda</h3>
                        <p>Desbloquea nuevas apariencias.</p>
                    </article>

                    <article class="option-card">
                        <h3>👤 Perfil</h3>
                        <p>Consulta tus estadísticas.</p>
                    </article>

                </section>

            </main>
        `;

    document.querySelector('#logoutButton').addEventListener('click', logout);

    document.querySelector('#playButton').addEventListener('click', startGame);

  } catch (error) {

    console.error(error);

    logout();
  }
}

// ==========================================
// EVITAR INSERTAR HTML DESDE EL USUARIO
// ==========================================

// ==========================================
// INICIAR PARTIDA CON PHASER
// ==========================================

function startGame() {

  const username = document.querySelector(
    '.welcome-card h1'
  ).textContent.replace('¡Bienvenido, ', '').replace('!', '');

  // Guardar los datos del jugador
  setGameSession(currentToken, username);

  // Mostrar pantalla del juego
  app.innerHTML = `
        <main class="game-page">

            <header class="game-header">

                <h2>🐍 SNAKE ONLINE</h2>

                <button id="exitGame" class="secondary-button">
                    Salir de la partida
                </button>

            </header>

            <section class="game-wrapper">

                <div id="game-container"></div>

                <p class="game-help">
                    Utiliza las flechas o WASD para mover tu personaje.
                </p>

            </section>

        </main>
    `;

  // Crear el juego
  gameInstance = new Phaser.Game({

    type: Phaser.AUTO,

    parent: 'game-container',

    width: 800,

    height: 600,

    backgroundColor: '#152238',

    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },

    scene: [GameScene]
  });

  // Boton para regresar al menu
  document.querySelector('#exitGame').addEventListener('click', () => {

    if (gameInstance) {

      const scene = gameInstance.scene.getScene('GameScene');

      if (scene) {
        scene.disconnectFromServer();
      }

      gameInstance.destroy(true);

      gameInstance = null;
    }

    showGameMenu();
  });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

// ==========================================
// CERRAR SESION
// ==========================================

function logout() {

  sessionStorage.removeItem('token');

  currentToken = null;

  showLogin();
}

// ==========================================
// INICIO DE LA APLICACION
// ==========================================

if (currentToken) {
  showGameMenu();
} else {
  showLogin();
}
