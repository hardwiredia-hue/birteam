import { redirect } from 'next/navigation';

/** La parte social ahora es BirtSocial; los links viejos siguen andando. */
export default async function Jugadas({
  searchParams,
}: {
  searchParams: Promise<{ compartir?: string }>;
}) {
  const { compartir } = await searchParams;
  redirect(compartir ? `/birtsocial?compartir=${encodeURIComponent(compartir)}` : '/birtsocial');
}
