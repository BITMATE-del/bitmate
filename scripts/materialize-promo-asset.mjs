import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const sourceDir = join(process.cwd(), '.asset-src', 'trade-anywhere');
const outputPath = join(process.cwd(), 'public', 'assets', 'bitmate-trade-anywhere.webp');
const expectedSha256 = '591a2d12c52e50b3795a48e0f43d3d59e046ac1de9f08fb8372a621ec2966a7a';

const chunks = readdirSync(sourceDir)
  .filter((name) => name.endsWith('.b64'))
  .sort()
  .map((name) => readFileSync(join(sourceDir, name), 'utf8').trim());

const bytes = Buffer.from(chunks.join(''), 'base64');
const digest = createHash('sha256').update(bytes).digest('hex');

if (digest !== expectedSha256) {
  throw new Error(`BITMATE trade anywhere asset checksum mismatch: ${digest}`);
}

if (bytes.subarray(0, 4).toString('ascii') !== 'RIFF' || bytes.subarray(8, 12).toString('ascii') !== 'WEBP') {
  throw new Error('BITMATE trade anywhere asset is not a valid WebP container');
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, bytes);
console.log(`Materialized BITMATE trade anywhere WebP (${bytes.length} bytes)`);
