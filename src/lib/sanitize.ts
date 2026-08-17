// ============================================================================
// Sanitización de contenido generado por usuarios (Custom Cards, nombres de
// cartas no catalogadas, comentarios de reseñas, apodos de perfil, ciudad,
// país…).
//
// Estrategia de defensa en profundidad sobre el escape automático de React 19:
// React renderiza todo nodo de texto JSX escapado (`{text}`), por lo que el
// contenido almacenado jamás debería interpretarse como HTML. Este módulo
// garantiza que lo que se escribe en Supabase sea limpio y neutralizado, y que
// los modales de preview nunca muestren markup malicioso.
//
// NO se usa dangerouslySetInnerHTML en la app: estos helpers procesan la
// entrada ANTES de llegar a la base de datos (Server Actions) y opcionalmente
// antes de renderizar (Client Components).
//
// Implementación con expresiones regulares estrictas y sin dependencias:
// funciona igual en Server Components (SSR) y Client Components (sin DOM),
// evitando la dependencia extra de isomorphic-dompurify.
// ============================================================================

/** Regex de caracteres de control (excluye \n y \t, que se normalizan aparte). */
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g

/** Bloques de scripts (cualquier atributo, cualquier contenido). */
const SCRIPT_BLOCK_RE = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi

/** Bloques de estilos embebidos (pueden ocultar payloads). */
const STYLE_BLOCK_RE = /<style\b[^>]*>[\s\S]*?<\/style\s*>/gi

/** Comentarios HTML (pueden contener condiciones de render tipo <![if ...]>). */
const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g

/** Cualquier etiqueta HTML abierta. */
const HTML_TAG_RE = /<[^>]*>/g

/** Ángulos sueltos que no formaron tag (sobrantes tras decodificar entidades). */
const STRAY_ANGLE_RE = /[<>]/g

/**
 * Decodifica las entidades HTML que representan caracteres peligrosos (named,
 * decimales y hex) para que no puedan sobrevivir a la sanitización como texto
 * codificado. Se aplica ANTES de eliminar tags: `&lt;b&gt;x&lt;/b&gt;` →
 * `<b>x</b>` → `x`. Cubre `< > " ' &` en sus formas `&lt;`, `&#60;`, `&#x3C;`…
 */
const DANGEROUS_ENTITY_RE =
  /&(lt|gt|quot|#0?39|#34|#38|#60|#62|#x26|#x27|#x3c|#x3e|amp);/gi

const DANGEROUS_ENTITY_MAP: Record<string, string> = {
  lt: '<',
  gt: '>',
  quot: '"',
  amp: '&',
  '#39': "'",
  '#039': "'",
  '#34': '"',
  '#38': '&',
  '#60': '<',
  '#62': '>',
  '#x26': '&',
  '#x27': "'",
  '#x3c': '<',
  '#x3e': '>'
}

function decodeDangerousEntities(value: string): string {
  return value.replace(
    DANGEROUS_ENTITY_RE,
    (match, name: string) => DANGEROUS_ENTITY_MAP[name.toLowerCase()] ?? match
  )
}

/** Neutraliza el esquema `javascript:` (previene URLs ejecutables). */
const JAVASCRIPT_SCHEME_RE = /javascript:/gi

// ---------------------------------------------------------------------------
// sanitizePlainText — texto plano genérico (usernames, ciudad, país, set, nº)
// ---------------------------------------------------------------------------

/**
 * Elimina etiquetas HTML, bloques de scripts, caracteres de control, esquemas
 * `javascript:` y entidades maliciosas de un texto, colapsando y recortando
 * espacios. No escapa (no preserva markup): destruye cualquier intento de
 * inyectar HTML/JS y deja solo texto legible.
 */
export function sanitizePlainText(input: unknown): string {
  if (typeof input !== 'string') return ''
  // Decodificar entidades peligrosas PRIMERO deja los tags al descubierto
  // (`&lt;b&gt;x` → `<b>x`) para que la limpieza de etiquetas los elimine.
  return decodeDangerousEntities(input)
    .replace(SCRIPT_BLOCK_RE, '')
    .replace(STYLE_BLOCK_RE, '')
    .replace(HTML_COMMENT_RE, '')
    .replace(HTML_TAG_RE, '')
    .replace(STRAY_ANGLE_RE, '')
    .replace(CONTROL_CHARS_RE, '')
    .replace(JAVASCRIPT_SCHEME_RE, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ---------------------------------------------------------------------------
// sanitizeCardTitle — nombres de cartas TCG
// ---------------------------------------------------------------------------

/**
 * Caracteres permitidos en un nombre de carta TCG: letras y números Unicode,
 * espacios y puntuación habitual de los nombres oficiales
 * (`Charizard ex`, `Greninja & Zoroark-GX`, `Rare Candy`, `Arceus VSTAR`…).
 * Todo lo demás se elimina. Máximo 80 caracteres.
 */
const CARD_TITLE_ALLOWED_RE = /[^\p{L}\p{N}\s\-&'.,!?()×*+%:/·–—]/gu

export function sanitizeCardTitle(input: unknown): string {
  if (typeof input !== 'string') return ''
  return decodeDangerousEntities(input)
    .replace(SCRIPT_BLOCK_RE, '')
    .replace(STYLE_BLOCK_RE, '')
    .replace(HTML_COMMENT_RE, '')
    .replace(HTML_TAG_RE, '')
    .replace(CONTROL_CHARS_RE, '')
    .replace(JAVASCRIPT_SCHEME_RE, '')
    .replace(CARD_TITLE_ALLOWED_RE, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

// ---------------------------------------------------------------------------
// sanitizeComment — comentarios de reseñas
// ---------------------------------------------------------------------------

/** Caracteres peligrosos que se escapan en un comentario de reseña. */
const HTML_ESCAPE_RE = /[<>"'&]/g

const HTML_ESCAPE_MAP: Record<string, string> = {
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '&': '&amp;'
}

/** Escapa los 5 caracteres que pueden romper/inyectar HTML. */
function escapeHtml(value: string): string {
  return value.replace(HTML_ESCAPE_RE, (ch) => HTML_ESCAPE_MAP[ch])
}

/** Máxima longitud de un comentario de reseña. */
export const MAX_COMMENT_LENGTH = 500

/**
 * Sanitiza un comentario de reseña: elimina scripts/tags/controles, normaliza
 * saltos de línea, colapsa espacios, ESCAPA los caracteres peligrosos
 * (`< > " ' &`) y limita la longitud a 500 caracteres. El valor resultante es
 * seguro incluso si en algún punto se renderizara como HTML crudo.
 */
export function sanitizeComment(input: unknown): string {
  if (typeof input !== 'string') return ''
  return escapeHtml(
    input
      .replace(SCRIPT_BLOCK_RE, '')
      .replace(STYLE_BLOCK_RE, '')
      .replace(HTML_COMMENT_RE, '')
      .replace(HTML_TAG_RE, '')
      .replace(CONTROL_CHARS_RE, '')
      .replace(JAVASCRIPT_SCHEME_RE, '')
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  ).slice(0, MAX_COMMENT_LENGTH)
}