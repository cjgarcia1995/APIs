# Snake Online 🐍

Juego multijugador en línea desarrollado con **Phaser 3, Node.js, Express, Socket.IO y Supabase**. El proyecto permite registrar usuarios, iniciar sesión, jugar partidas en tiempo real, obtener recompensas, comprar y equipar skins, consultar estadísticas y administrar usuarios.

## 1. Tecnologías utilizadas

| Tecnología | Función |
|---|---|
| JavaScript | Lenguaje de programación |
| Node.js | Entorno de ejecución del backend |
| Express | API REST |
| Socket.IO | Comunicación multijugador en tiempo real |
| Phaser 3 | Motor del juego |
| Vite | Servidor de desarrollo del frontend |
| Supabase / PostgreSQL | Base de datos |
| JWT | Autenticación |
| bcrypt | Protección de contraseñas |
| Zod | Validación de datos |
| Swagger | Documentación de la API |
| mkcert | Certificados HTTPS locales |

## 2. Requisitos previos

Antes de instalar el proyecto, se necesita:

- Windows 10 u 11.
- Git.
- Node.js **22 LTS o una versión compatible con Vite 8** (mínimo Node 20.19 o 22.12).
- npm, incluido con Node.js.
- mkcert.
- Acceso al proyecto de Supabase utilizado por la aplicación.
- Visual Studio Code (recomendado).

Para verificar Node.js y npm, abre una terminal y ejecuta:

```bash
node -v
npm -v
```

Para verificar Git:

```bash
git --version
```

## 3. Clonar el repositorio

Abre Git Bash, PowerShell o una terminal y ejecuta:

```bash
git clone https://github.com/cjgarcia1995/APIs.git
```

Entra en la carpeta del proyecto:

```bash
cd APIs/snake-online
```

Abre la carpeta en Visual Studio Code:

```bash
code .
```

La estructura principal del proyecto es:

```text
snake-online/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── docs/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── sockets/
│   │   └── server.js
│   │
│   ├── certs/             (se genera localmente)
│   ├── .env               (se configura localmente)
│   ├── .env.example
│   ├── package.json
│   └── package-lock.json
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── assets/
    │   ├── scenes/
    │   ├── services/
    │   ├── main.js
    │   └── style.css
    │
    ├── package.json
    ├── package-lock.json
    └── vite.config.js
```

## 4. Configurar las variables de entorno del backend

El backend necesita credenciales para conectarse a Supabase y firmar los tokens JWT.

Por seguridad, el archivo `.env` no se encuentra en GitHub. Se proporciona `.env.example` como plantilla.

### 4.1 Crear el archivo .env

Entra en la carpeta `backend`:

```bash
cd backend
```

Copia el archivo de ejemplo.

En Git Bash:

```bash
cp .env.example .env
```

En PowerShell:

```powershell
Copy-Item .env.example .env
```

### 4.2 Configurar las variables

Abre `backend/.env` y completa los valores:

```env
PORT=3000
FRONTEND_URL=https://localhost:5173

SUPABASE_URL=TU_URL_DE_SUPABASE
SUPABASE_SERVICE_ROLE_KEY=TU_SECRET_KEY_DE_SUPABASE

JWT_SECRET=TU_SECRETO_ALEATORIO
```

**¿Dónde obtener las credenciales de Supabase?**

1. Entra en el panel de [Supabase](https://supabase.com/dashboard).
2. Abre el proyecto utilizado por Snake Online.
3. Busca la URL del proyecto y la clave secreta del backend en la sección de configuración de API y claves del proyecto.
4. Copia los valores correspondientes al archivo `.env`.

La variable `SUPABASE_SERVICE_ROLE_KEY` debe contener la clave secreta del backend que corresponde al proyecto. No debe utilizarse una clave pública en su lugar.

Para generar un secreto JWT propio, puedes ejecutar:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copia el resultado en `JWT_SECRET`.

**Importante:**

- Nunca compartas el archivo `.env`.
- Nunca coloques la clave secreta de Supabase en el frontend.
- No publiques el secreto JWT.
- Cada computadora puede utilizar su propio `JWT_SECRET`.
- Si se utiliza el mismo proyecto de Supabase, no es necesario crear nuevamente las tablas para cada computadora.

## 5. Configurar los certificados HTTPS

El proyecto utiliza HTTPS tanto en el backend como en el frontend.

Los certificados se generan localmente mediante mkcert. No se incluyen en GitHub porque son específicos de cada computadora.

### 5.1 Instalar mkcert

Instala mkcert en Windows y asegúrate de que el comando esté disponible desde la terminal.

Puedes consultar las instrucciones oficiales:

https://github.com/FiloSottile/mkcert

### 5.2 Instalar la autoridad certificadora local

Abre una terminal y ejecuta:

```bash
mkcert -install
```

Este paso instala la autoridad certificadora local para que el navegador pueda confiar en los certificados generados.

### 5.3 Generar los certificados

Desde la carpeta `snake-online`, entra en `backend`:

```bash
cd backend
```

Crea la carpeta de certificados:

```bash
mkdir certs
```

Entra en ella:

```bash
cd certs
```

Genera los certificados:

```bash
mkcert -key-file localhost+2-key.pem -cert-file localhost+2.pem localhost 127.0.0.1 ::1
```

Se deben crear estos dos archivos:

```text
backend/
└── certs/
    ├── localhost+2.pem
    └── localhost+2-key.pem
```

Los nombres deben conservarse exactamente porque `server.js` y `vite.config.js` utilizan esas rutas.

Regresa a la carpeta principal del proyecto:

```bash
cd ../..
```

**Nota:** si el navegador no reconoce el certificado, verifica que `mkcert -install` se haya ejecutado correctamente y reinicia el navegador. En algunos navegadores puede ser necesario configurar la confianza en la autoridad certificadora local.

## 6. Instalar las dependencias

El proyecto contiene archivos `package-lock.json` para instalar las versiones de dependencias utilizadas durante el desarrollo.

No es necesario copiar las carpetas `node_modules` de otra computadora.

### 6.1 Instalar dependencias del backend

Desde la carpeta principal `snake-online`:

```bash
cd backend
npm ci
```

### 6.2 Instalar dependencias del frontend

Regresa a la carpeta principal:

```bash
cd ..
```

Entra en frontend e instala sus dependencias:

```bash
cd frontend
npm ci
```

## 7. Ejecutar el proyecto

Para ejecutar Snake Online se necesitan dos terminales abiertas: una para el backend y otra para el frontend.

### 7.1 Iniciar el backend

Abre la primera terminal:

```bash
cd APIs/snake-online/backend
npm run dev
```

El servidor debe iniciar utilizando HTTPS en el puerto 3000.

Para comprobar que funciona, abre:

https://localhost:3000/api/health

La respuesta esperada es similar a:

```json
{
  "success": true,
  "message": "El servidor de Snake Online funciona correctamente",
  "status": "ONLINE"
}
```

### 7.2 Iniciar el frontend

Abre una segunda terminal:

```bash
cd APIs/snake-online/frontend
npm run dev
```

Vite debe iniciar en:

https://localhost:5173/

Abre esa dirección en el navegador para acceder al juego.

**Importante:** mantén abiertas ambas terminales mientras utilizas la aplicación.

## 8. Documentación de la API

La documentación interactiva de Swagger está disponible cuando el backend se encuentra iniciado:

https://localhost:3000/api-docs

Desde Swagger se pueden consultar y probar los endpoints documentados.

Para probar endpoints protegidos:

1. Inicia sesión mediante `POST /api/auth/login`.
2. Copia el token JWT recibido.
3. Pulsa el botón **Authorize** en Swagger.
4. Introduce el token.
5. Ejecuta los endpoints que requieren autenticación.

## 9. Funcionalidades principales

### Autenticación y usuarios

- Registro de usuarios.
- Inicio de sesión.
- Contraseñas protegidas mediante bcrypt.
- Autenticación mediante JWT.
- Consulta del perfil del usuario.
- Restricción de acceso para usuarios suspendidos.

### Juego multijugador

- Salas multijugador mediante Socket.IO.
- Hasta 10 jugadores por sala.
- Movimiento en tiempo real.
- Generación de comida.
- Detección de colisiones.
- Eliminación de jugadores.
- Pantalla de espera hasta reunir al menos dos jugadores.
- Finalización de la partida cuando queda un único jugador en pie.
- Registro de resultados en Supabase.

### Economía y personalización

- Sistema de créditos.
- Recompensas por partidas elegibles.
- Compra de skins.
- Equipamiento de skins.
- Registro de transacciones.
- Consulta de clasificación de jugadores.

### Administración

- Consulta de usuarios.
- Suspensión de usuarios.
- Reactivación de usuarios.
- Restricción de acceso a funcionalidades administrativas.

## 10. Base de datos y Supabase

Snake Online utiliza Supabase como servicio de base de datos PostgreSQL.

El proyecto trabaja con tablas relacionadas con:

- Usuarios.
- Estadísticas de jugadores.
- Skins.
- Skins adquiridas por usuarios.
- Transacciones.
- Partidas.
- Jugadores de cada partida.
- Suspensiones de usuarios.

También utiliza funciones SQL para operaciones importantes, entre ellas:

- Compra de skins.
- Equipamiento de skins.
- Suspensión y reactivación de usuarios.
- Finalización de partidas y procesamiento de recompensas.

**Importante para una instalación nueva:**

El repositorio contiene el código del backend y frontend, pero no incluye todavía un paquete completo de scripts SQL para reconstruir desde cero todas las tablas, restricciones, políticas RLS y funciones de Supabase.

Por ello, para ejecutar esta versión se debe utilizar el proyecto de Supabase ya configurado y conservar su estructura de base de datos.

Si se desea utilizar un proyecto de Supabase completamente nuevo, primero será necesario exportar y ejecutar el esquema y las funciones SQL correspondientes, además de configurar sus políticas de seguridad. No basta con crear un proyecto vacío y colocar sus credenciales.

## 11. Seguridad

El proyecto incorpora diferentes medidas de seguridad:

- Contraseñas cifradas mediante bcrypt.
- Autenticación mediante JWT.
- Validación de entradas con Zod.
- Protección de rutas privadas.
- Control de permisos administrativos.
- Limitación de intentos de autenticación.
- Helmet.
- Configuración de CORS.
- Supabase con acceso desde el backend.
- Políticas RLS en las tablas.
- Funciones SQL con permisos controlados.
- HTTPS durante el desarrollo local.

Los archivos siguientes no deben publicarse en GitHub:

```text
.env
.env.*
node_modules/
dist/
certs/
```

El archivo `.env.example` sí puede publicarse porque únicamente contiene nombres de variables y valores de ejemplo.

## 12. Solución de problemas frecuentes

### Error: Cannot find module

Comprueba que instalaste las dependencias en la carpeta correspondiente:

```bash
npm ci
```

Ejecuta el comando tanto en `backend` como en `frontend`.

### Error: Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY

Comprueba que:

- Existe `backend/.env`.
- Las variables están escritas correctamente.
- Los valores corresponden al proyecto de Supabase.
- No hay espacios innecesarios ni comillas incorrectas.

Después reinicia el backend.

### Error: ENOENT al iniciar HTTPS

Comprueba que existen estos archivos:

```text
backend/certs/localhost+2-key.pem
backend/certs/localhost+2.pem
```

Si no existen, vuelve a generar los certificados siguiendo el apartado 5.

### Error: Failed to fetch

Comprueba que:

- El backend está ejecutándose.
- El frontend está utilizando `https://localhost:3000/api`.
- `FRONTEND_URL` en `.env` contiene exactamente `https://localhost:5173`.
- El backend se reinició después de modificar `.env`.
- El navegador confía en los certificados locales.

### Error: Puerto ocupado

Si el puerto 3000 o 5173 está siendo utilizado por otra aplicación, cierra el proceso que lo ocupa antes de iniciar Snake Online.

### Error de conexión con Socket.IO

Comprueba que el backend está funcionando y que el frontend se conecta mediante HTTPS a `https://localhost:3000`.

También verifica que el usuario haya iniciado sesión y que el token JWT sea válido.

### Error al acceder a Supabase

Comprueba que el proyecto de Supabase sigue activo y que la URL y clave secreta corresponden al mismo proyecto donde están las tablas y funciones de Snake Online.

## 13. Comandos de referencia

| Acción | Comando |
|---|---|
| Instalar backend | `cd backend && npm ci` |
| Ejecutar backend | `npm run dev` |
| Instalar frontend | `cd frontend && npm ci` |
| Ejecutar frontend | `npm run dev` |
| Compilar frontend | `npm run build` |
| Verificar Node | `node -v` |
| Verificar npm | `npm -v` |
| Verificar Git | `git --version` |

## 14. Direcciones locales

| Servicio | Dirección |
|---|---|
| Juego | https://localhost:5173/ |
| Backend | https://localhost:3000/ |
| Verificación del backend | https://localhost:3000/api/health |
| Swagger | https://localhost:3000/api-docs |

## 15. Consideraciones finales

Snake Online está preparado para ejecutarse localmente mediante HTTPS, con comunicación en tiempo real y persistencia de información en Supabase.

Para instalarlo en otra computadora se deben repetir los pasos de clonación, configuración de variables de entorno, generación de certificados e instalación de dependencias.

El proyecto utiliza Supabase como servicio externo, por lo que la disponibilidad de la base de datos y la configuración correcta de sus credenciales son necesarias para el funcionamiento completo de la aplicación.

---

**Repositorio:** https://github.com/cjgarcia1995/APIs

**Proyecto:** Snake Online