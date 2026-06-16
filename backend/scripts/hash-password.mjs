import { argon2id, hash } from 'argon2';

const password = process.argv[2];

if (password === undefined || password.length === 0) {
  console.error('Usage: npm run auth:hash-password -- <password>');
  process.exitCode = 1;
} else {
  console.log(await hash(password, { type: argon2id }));
}
