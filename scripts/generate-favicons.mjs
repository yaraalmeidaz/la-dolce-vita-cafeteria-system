import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

// Fonte: use o maior ícone já exportado (melhor qualidade para reamostragem).
const src = path.join(root, 'src', 'assets', 'favicon_io', 'android-chrome-512x512.png');
const outDir = path.join(root, 'public', 'favicon_io');

const targets = [
  { name: 'android-chrome-512x512.png', size: 512 },
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
];

const ZOOM = Math.min(3, Math.max(1, Number(process.env.FAVICON_ZOOM ?? '1.8')));

async function buildBaseIcon() {
  // 1) trim: remove bordas iguais ao pixel do canto superior esquerdo.
  // 2) zoom: recorta o centro para ocupar o máximo possível do quadrado.
  const trimmed = sharp(src, { failOnError: true }).ensureAlpha().trim({ threshold: 10 });
  const meta = await trimmed.metadata();
  if (!meta.width || !meta.height) return trimmed;

  const side = Math.min(meta.width, meta.height);
  const cropSide = Math.max(1, Math.round(side / ZOOM));
  const left = Math.max(0, Math.round((meta.width - cropSide) / 2));
  const top = Math.max(0, Math.round((meta.height - cropSide) / 2));

  return trimmed.extract({ left, top, width: cropSide, height: cropSide });
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });

  const base = await buildBaseIcon();

  await Promise.all(
    targets.map(({ name, size }) =>
      base
        .clone()
        .resize(size, size, {
          fit: 'cover',
        })
        .png({ compressionLevel: 9 })
        .toFile(path.join(outDir, name))
    )
  );

  // Se existir um .ico já pronto, copia (padrão do favicon.io)
  try {
    await fs.copyFile(
      path.join(root, 'src', 'assets', 'favicon_io', 'favicon.ico'),
      path.join(outDir, 'favicon.ico')
    );
  } catch {
    // sem .ico, segue normal
  }

  const manifest = {
    name: '',
    short_name: '',
    icons: [
      {
        src: '/favicon_io/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/favicon_io/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    theme_color: '#ffffff',
    background_color: '#ffffff',
    display: 'standalone',
  };

  await fs.writeFile(
    path.join(outDir, 'site.webmanifest'),
    JSON.stringify(manifest),
    'utf8'
  );

  // eslint-disable-next-line no-console
  console.log(`Favicons gerados em ${outDir}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
