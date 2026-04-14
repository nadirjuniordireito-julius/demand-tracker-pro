import fs from 'node:fs';
import path from 'node:path';

const localeDir = path.resolve('src/i18n/locales');
const files = ['pt.json', 'en.json', 'es.json'].map((name) => path.join(localeDir, name));

const suspiciousPatterns = [
  /cÃ/g,
  /Ã§/g,
  /Ã¡/g,
  /Ã£/g,
  /Ãµ/g,
  /Ã©/g,
  /Ãª/g,
  /Ãº/g,
  /Â/g,
  /�/g,
];

let hasError = false;

for (const filePath of files) {
  const raw = fs.readFileSync(filePath, 'utf8');

  try {
    JSON.parse(raw);
  } catch (error) {
    hasError = true;
    console.error(`[i18n-check] JSON inválido em ${filePath}`);
    console.error(error instanceof Error ? error.message : String(error));
  }

  const controlChars = raw.match(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g);
  if (controlChars && controlChars.length > 0) {
    hasError = true;
    console.error(`[i18n-check] Caracteres de controle encontrados em ${filePath}`);
  }

  for (const pattern of suspiciousPatterns) {
    const matches = raw.match(pattern);
    if (matches && matches.length > 0) {
      hasError = true;
      console.error(
        `[i18n-check] Possível mojibake em ${filePath}: padrão "${pattern.source}" (${matches.length} ocorrência(s))`
      );
    }
  }
}

if (hasError) {
  console.error('\n[i18n-check] Falha de integridade de encoding detectada.');
  process.exit(1);
}

console.log('[i18n-check] OK: locale files sem sinais de corrupção.');
