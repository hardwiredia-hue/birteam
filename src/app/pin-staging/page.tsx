import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { PantallaPin } from '@/components/pin-staging';
import { COOKIE_PIN, cookieValida, hashPinStaging } from '@/lib/pin-staging';

export const metadata = { title: 'Staging', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** Pantalla del PIN de staging (el middleware la muestra en cualquier dirección). */
export default async function PinStaging() {
  const hash = await hashPinStaging();
  const cookie = (await cookies()).get(COOKIE_PIN)?.value;
  if (!hash || cookieValida(hash, cookie)) redirect('/');
  return <PantallaPin />;
}
