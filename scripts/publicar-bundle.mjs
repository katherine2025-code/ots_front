#!/usr/bin/env node
/**
 * Publica una actualización web (Live Update) al backend: compila, empaqueta `www/` en un .zip
 * y lo sube. Todos los teléfonos con el APK la descargan solos al abrir (y la aplican en el
 * siguiente arranque). NO recompila el APK: solo cambia el contenido web.
 *
 * Uso (PowerShell, desde ots_front):
 *   $env:OTS_EMAIL="tu_correo@upse.edu.ec"; $env:OTS_PASS="tu_clave"
 *   node scripts/publicar-bundle.mjs                 # versión automática (fecha/hora)
 *   node scripts/publicar-bundle.mjs v1.2.0          # versión manual
 *   node scripts/publicar-bundle.mjs v1.2.0 --no-build   # si ya corriste ng build
 *
 * Variables opcionales:
 *   OTS_API   base del backend (default: https://ots-backend.serverteced.cloud/api)
 *   OTS_NOTAS notas de la versión
 */
import { execSync } from 'node:child_process';
import { createWriteStream, readFileSync, existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wwwDir = path.join(raiz, 'www');
const zipPath = path.join(raiz, 'www-bundle.zip');

const API = (process.env.OTS_API || 'https://ots-backend.serverteced.cloud/api').replace(/\/$/, '');
const CORREO = process.env.OTS_EMAIL;
const CLAVE = process.env.OTS_PASS;

const args = process.argv.slice(2);
const noBuild = args.includes('--no-build');
const version = args.find(a => !a.startsWith('--')) || fechaVersion();
const notas = process.env.OTS_NOTAS || '';

function fechaVersion() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}${p(d.getDate())}.${p(d.getHours())}${p(d.getMinutes())}`;
}

function log(msg) { console.log(`\n▸ ${msg}`); }

async function zipWww() {
  if (!existsSync(wwwDir)) throw new Error('No existe www/. Corre primero el build (sin --no-build).');
  await rm(zipPath, { force: true });
  await new Promise((resolve, reject) => {
    const out = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    out.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(out);
    archive.directory(wwwDir, false); // false = contenido en la raíz del zip (index.html al tope)
    archive.finalize();
  });
}

async function login() {
  if (!CORREO || !CLAVE) throw new Error('Falta OTS_EMAIL y/o OTS_PASS (debe ser una cuenta Super Administrador).');
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: CORREO, password: CLAVE })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.token) throw new Error(`Login falló: ${data.error || r.status}`);
  return data.token;
}

async function publicar(token) {
  const buf = readFileSync(zipPath);
  const form = new FormData();
  form.append('version', version);          // los campos de texto van ANTES del archivo
  if (notas) form.append('notas', notas);
  form.append('bundle', new Blob([buf], { type: 'application/zip' }), `${version}.zip`);

  const r = await fetch(`${API}/app/publicar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Publicación falló: ${data.error || r.status}`);
  return data;
}

(async () => {
  try {
    if (!noBuild) {
      log('Compilando web (ng build --configuration production)...');
      execSync('npm run build -- --configuration production', { cwd: raiz, stdio: 'inherit' });
    }
    log(`Empaquetando www/ → ${path.basename(zipPath)} (versión ${version})...`);
    await zipWww();
    log('Iniciando sesión en el backend...');
    const token = await login();
    log('Subiendo el bundle...');
    const res = await publicar(token);
    await rm(zipPath, { force: true });
    log(`✅ Publicado. Versión "${res.version}" disponible en: ${API.replace('/api', '')}/app-bundles/${res.file}`);
    console.log('   Los teléfonos la descargarán al abrir la app y la aplicarán en el próximo arranque.');
  } catch (e) {
    console.error(`\n✖ ${e.message}\n`);
    process.exit(1);
  }
})();
