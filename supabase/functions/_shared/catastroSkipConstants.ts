export const EXPLICIT_CATASTRO_SKIP_PATTERN =
  /\b(no\s+tengo\s+(el\s+)?catastro|no\s+tengo\s+(la\s+)?(c[eé]dula|ficha|referencia)(\s+catastral)?|sin\s+catastro|sin\s+(c[eé]dula|ficha|referencia)(\s+catastral)?|no\s+(dispongo|poseo)\s+de\s+catastro|omitir\s+catastro|no\s+hay\s+catastro|no\s+cuenta\s+con\s+catastro|no\s+posee\s+catastro)\b/i;

export const CONTEXTUAL_CATASTRO_SKIP_PATTERN =
  /^(no(\s+tengo|\s+lo\s+tengo|\s+la\s+tengo|\s+dispongo|\s+poseo)?|omitir|paso|despu[eé]s|luego|ningun[oa]|no\s+aplica)$/i;
