import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_PIN, cookieValida, esStaging, leerHashPin } from '@/lib/pin-staging';

/**
 * Candado de staging: si tiene PIN cargado, nada del sitio se ve sin la
 * cookie de acceso. Corre antes de cada pedido (páginas y API), así no hay
 * forma de saltearlo navegando. En producción sale enseguida sin tocar nada.
 */

// Lo que tiene que seguir andando sin PIN: entrar con el PIN, las tareas
// programadas (usan su propia clave), el aviso de Mercado Pago y los
// archivos estáticos que necesita la propia pantalla del PIN.
const LIBRES = [
  /^\/pin-staging$/,
  /^\/api\/staging\/pin$/,
  /^\/api\/tareas$/,
  /^\/api\/pagos\/webhook$/,
  /^\/robots\.txt$/,
  /^\/_next\//,
];

const ES_STAGING = esStaging();

export async function middleware(request: NextRequest) {
  if (!ES_STAGING) return NextResponse.next();
  const ruta = request.nextUrl.pathname;
  if (LIBRES.some((libre) => libre.test(ruta))) return NextResponse.next();

  const hash = await leerHashPin();
  if (!hash || cookieValida(hash, request.cookies.get(COOKIE_PIN)?.value)) return NextResponse.next();

  if (ruta.startsWith('/api/')) {
    return NextResponse.json({ error: 'Staging: ingresá el PIN.' }, { status: 401 });
  }
  // Las páginas muestran la pantalla del PIN en la misma dirección.
  return NextResponse.rewrite(new URL('/pin-staging', request.url), { status: 401 });
}

export const config = {
  runtime: 'nodejs',
  matcher: ['/((?!_next/static|_next/image).*)'],
};
