import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';

export default defineConfig({
    server: {
        https: {
            key: fs.readFileSync(
                path.resolve(import.meta.dirname, '../backend/certs/localhost+2-key.pem')
            ),
            cert: fs.readFileSync(
                path.resolve(import.meta.dirname, '../backend/certs/localhost+2.pem')
            )
        },
        host: 'localhost',
        port: 5173
    }
});