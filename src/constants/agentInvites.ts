export const ADD_AGENT_OUTCOMES = ['agent_added', 'invited', 'already_listed', 'unavailable'] as const;

export const INVITE_EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const MIN_INVITE_EMAIL_LENGTH = 3;

export const MAX_INVITE_EMAIL_LENGTH = 254;
