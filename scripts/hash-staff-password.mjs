import { pbkdf2Sync, randomBytes } from 'node:crypto';

const ITERATIONS = 310_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

function readHiddenPassword(prompt) {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    if (!input.isTTY || typeof input.setRawMode !== 'function') {
      reject(new Error('Execute este comando em um terminal interativo.'));
      return;
    }

    let password = '';
    const finish = (error) => {
      input.off('data', onData);
      input.setRawMode(false);
      input.pause();
      process.stdout.write('\n');
      if (error) reject(error);
      else resolve(password);
    };
    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === '\u0003') return finish(new Error('Operação cancelada.'));
        if (character === '\r' || character === '\n') return finish();
        if (character === '\u007f' || character === '\b') password = password.slice(0, -1);
        else if (character >= ' ') password += character;
      }
    };

    process.stdout.write(prompt);
    input.setEncoding('utf8');
    input.setRawMode(true);
    input.resume();
    input.on('data', onData);
  });
}

try {
  const password = await readHiddenPassword('Senha do colaborador (mínimo 12 caracteres): ');
  if (password.length < 12 || password.length > 256) {
    throw new Error('A senha precisa ter entre 12 e 256 caracteres.');
  }
  const salt = randomBytes(SALT_BYTES);
  const hash = pbkdf2Sync(password, salt, ITERATIONS, HASH_BYTES, 'sha256');
  process.stdout.write(`Hash para inserir no D1:\npbkdf2-sha256$${ITERATIONS}$${salt.toString('base64url')}$${hash.toString('base64url')}\n`);
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
