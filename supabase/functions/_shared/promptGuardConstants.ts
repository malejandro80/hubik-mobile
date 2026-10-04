export const SENSITIVE_TOPIC_PATTERNS = [
  ['owner', /\b(propietari[oa]s?|duen[oa]s?|arrendador(a|es)?|landlord|owner)\b/],
  [
    'exact_location',
    /(direccion (exacta|completa)|cual es la direccion|donde (queda|esta) exactamente|coordenadas|ubicacion exacta|latitud|longitud|numero de (la )?(casa|apartamento|puerta))/,
  ],
  ['cadastre', /catastr/],
  ['personal_contact', /\b(telefono|celular|movil|correo|email|e-mail|whatsapp|numero de contacto|contacto personal)\b/],
  ['other_clients', /(otros clientes|quien (mas )?(la )?(ha )?(visto|visitado|preguntado|alquilado|comprado)|quien vive|inquilin)/],
  ['unpublished_terms', /(precio minimo|ultimo precio|rebaja|descuento|negociable|aceptan? menos|cuanto (menos|bajan?)|oferta minima)/],
] as const;

export const THREAT_PATTERNS = [
  [
    'secrets',
    /(variables? de entorno|environment variables?|\.env\b|\benv\b|api[ _-]?key|claves? (de (la )?)?api|claves? secretas?|secret key|service[_ ]role|credenciales|contrasena de la base|password de la base|supabase_|gemini_api|groq_api|token de acceso|access token)/,
  ],
  [
    'instruction_override',
    /(ignora (todas |todo |las |tus |cualquier )*(instrucciones|reglas|indicaciones)|olvida (tus |las )?(instrucciones|reglas)|ignore (all |previous |your )*instructions|modo desarrollador|developer mode|jailbreak|\bdan\b|sin restricciones|sin filtros|you are now|a partir de ahora eres)/,
  ],
  [
    'prompt_extraction',
    /(prompt del sistema|system prompt|tus instrucciones|instrucciones internas|reglas internas|tu configuracion|como estas programad|muestra(me)? tu prompt)/,
  ],
  [
    'sql_injection',
    /(\b(drop|truncate|alter)\s+table\b|\bdelete\s+from\b|\binsert\s+into\b|\bupdate\s+\w+\s+set\b|\bunion\s+(all\s+)?select\b|;\s*--|'\s*or\s*'?\d+'?\s*=\s*'?\d+|\bpg_sleep\b|information_schema|pg_catalog|\bselect\s+\*\s+from\b)/,
  ],
  ['code_injection', /(<\s*script|javascript:|on(error|load)\s*=|\$\{|\beval\s*\(|\.\.\/|rm\s+-rf|\bexec\s*\()/],
] as const;
