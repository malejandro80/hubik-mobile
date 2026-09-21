export const EMAIL_IN_TEXT_PATTERN = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/i;

export const ACCENT_MARKS_PATTERN = /[̀-ͯ]/g;

export const NON_WORD_PATTERN = /[^a-z0-9\s]/g;

export const WHITESPACE_PATTERN = /\s+/;

export const CANCEL_WORDS = ['cancela', 'cancelar', 'cancelo', 'quita', 'quitar', 'elimina', 'eliminar', 'borra', 'borrar', 'anula', 'anular'];

export const ADD_WORDS = [
  'agrega',
  'agregar',
  'agregame',
  'anade',
  'anadir',
  'invita',
  'invitar',
  'suma',
  'sumar',
  'registra',
  'registrar',
  'incluye',
  'incluir',
];

export const AGENT_WORDS = ['agente', 'agentes'];

export const TEAM_WORDS = ['agente', 'agentes', 'equipo', 'invitaciones', 'invitados'];

export const COUNT_PATTERN = /\b(cuantos|cuantas|numero de)\b/;

export const WHO_PATTERN = /\b(quienes|quien)\b/;

export const LIST_WORDS = ['lista', 'listar', 'muestra', 'muestrame', 'mostrar', 'ver', 'dime', 'dame'];

export const HOME_WORDS = ['vuelve', 'volver', 'vuelvo', 'ir', 've', 'llevame', 'lleva', 'regresa', 'regresar'];

export const HOME_TARGET_PATTERN = /\b(inicio|chat principal|pantalla principal|chat|principal)\b/;
