/**
 * Ingreso con Google (OAuth 2.0 / OpenID, flujo de código del lado del
 * servidor, sin librerías). Necesita GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET
 * del ambiente; sin ellos el botón no aparece y todo sigue como siempre.
 */

export function googleHabilitado() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** La URL pública del ambiente, para armar la vuelta del OAuth. */
export function urlBase(request: Request) {
  if (process.env.URL_PUBLICA) return process.env.URL_PUBLICA.replace(/\/$/, '');
  const encabezados = new Headers(request.headers);
  const protocolo = encabezados.get('x-forwarded-proto') ?? 'http';
  const anfitrion = encabezados.get('x-forwarded-host') ?? encabezados.get('host') ?? 'localhost';
  return `${protocolo}://${anfitrion}`;
}

export function urlAutorizacion(request: Request, estado: string) {
  const parametros = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${urlBase(request)}/api/auth/google/volver`,
    response_type: 'code',
    scope: 'openid email profile',
    state: estado,
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${parametros}`;
}

export interface PerfilGoogle {
  googleId: string;
  email: string;
  emailVerificado: boolean;
  nombre: string;
  foto: string | null;
}

/** Canjea el código por el id_token y devuelve el perfil. */
export async function canjearCodigo(request: Request, codigo: string): Promise<PerfilGoogle | null> {
  const respuesta = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: codigo,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${urlBase(request)}/api/auth/google/volver`,
      grant_type: 'authorization_code',
    }),
  });
  if (!respuesta.ok) return null;
  const datos = await respuesta.json().catch(() => null);
  const idToken: string | undefined = datos?.id_token;
  if (!idToken) return null;

  // El token llega directo de Google por TLS: alcanza con leer su contenido.
  const partes = idToken.split('.');
  if (partes.length !== 3) return null;
  try {
    const crudo = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'));
    if (!crudo.sub || !crudo.email) return null;
    return {
      googleId: String(crudo.sub),
      email: String(crudo.email).toLowerCase(),
      emailVerificado: crudo.email_verified === true || crudo.email_verified === 'true',
      nombre: String(crudo.name ?? crudo.given_name ?? 'Jugador'),
      foto: typeof crudo.picture === 'string' ? crudo.picture : null,
    };
  } catch {
    return null;
  }
}
