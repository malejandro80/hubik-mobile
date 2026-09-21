import { readFileSync } from 'node:fs';
import { sign } from 'node:crypto';
import { parseArgs } from 'node:util';
import {
  APPLE_AUDIENCE,
  REQUIRED_OPTIONS,
  SECRET_LIFETIME_SECONDS,
  USAGE,
} from './appleClientSecret.constants.mjs';

const { values } = parseArgs({
  options: {
    'team-id': { type: 'string' },
    'key-id': { type: 'string' },
    'services-id': { type: 'string' },
    p8: { type: 'string' },
  },
});

if (REQUIRED_OPTIONS.some((option) => !values[option])) {
  console.error(USAGE);
  process.exit(1);
}

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

const issuedAt = Math.floor(Date.now() / 1000);
const expiresAt = issuedAt + SECRET_LIFETIME_SECONDS;

const header = encode({ alg: 'ES256', kid: values['key-id'] });
const payload = encode({
  iss: values['team-id'],
  iat: issuedAt,
  exp: expiresAt,
  aud: APPLE_AUDIENCE,
  sub: values['services-id'],
});

const signingInput = `${header}.${payload}`;
const signature = sign('sha256', Buffer.from(signingInput), {
  key: readFileSync(values.p8, 'utf8'),
  dsaEncoding: 'ieee-p1363',
}).toString('base64url');

console.log(`${signingInput}.${signature}`);
console.error(`Expires ${new Date(expiresAt * 1000).toISOString()}. Generate a new one before then.`);
