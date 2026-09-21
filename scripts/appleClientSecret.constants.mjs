export const APPLE_AUDIENCE = 'https://appleid.apple.com';

export const SECRET_LIFETIME_SECONDS = 15552000;

export const REQUIRED_OPTIONS = ['team-id', 'key-id', 'services-id', 'p8'];

export const USAGE =
  'Usage: node scripts/apple-client-secret.mjs --team-id <TEAM_ID> --key-id <KEY_ID> --services-id <SERVICES_ID> --p8 <path/to/AuthKey_XXXXXXXXXX.p8>';
