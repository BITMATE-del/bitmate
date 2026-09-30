import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const sourceDir = join(process.cwd(), '.asset-src', 'mobile-promo');
const outputPath = join(process.cwd(), 'public', 'assets', 'bitmate-mobile-promo.webp');
const expectedSha256 = 'ff9e2f20f1c3d08e15d46df536a7de36fd5c3431ee9e979380e18b328fdc851a';

const chunks = readdirSync(sourceDir)
  .filter((name) => name.endsWith('.b64'))
  .sort()
  .map((name) => readFileSync(join(sourceDir, name), 'utf8').trim());

const bytes = Buffer.from(chunks.join(''), 'base64');
const digest = createHash('sha256').update(bytes).digest('hex');

if (digest !== expectedSha256) {
  throw new Error(`BITMATE mobile promo asset checksum mismatch: ${digest}`);
}

if (bytes.subarray(0, 4).toString('ascii') !== 'RIFF' || bytes.subarray(8, 12).toString('ascii') !== 'WEBP') {
  throw new Error('BITMATE mobile promo asset is not a valid WebP container');
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, bytes);
console.log(`Materialized BITMATE mobile promo WebP (${bytes.length} bytes)`);
