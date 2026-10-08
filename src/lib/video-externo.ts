/**
 * Videos por link externo: YouTube y Vimeo se embeben con su reproductor;
 * TikTok e Instagram (que exigen sus propios scripts) quedan como tarjeta
 * que abre el video. Cualquier otro link se rechaza: esto es para videos.
 */

export interface VideoExterno {
  url: string;
  proveedor: 'YouTube' | 'TikTok' | 'Instagram' | 'Vimeo';
  /** URL embebible (iframe); null cuando solo va la tarjeta-link. */
  embed: string | null;
}

export function analizarVideoExterno(crudo: string): VideoExterno | null {
  let url: URL;
  try {
    url = new URL(crudo.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const anfitrion = url.hostname.replace(/^www\.|^m\./, '').toLowerCase();

  // YouTube: watch?v=, youtu.be/<id>, /shorts/<id>, /embed/<id>, /live/<id>
  if (anfitrion === 'youtube.com' || anfitrion === 'youtu.be' || anfitrion === 'music.youtube.com') {
    let id: string | null = null;
    if (anfitrion === 'youtu.be') id = url.pathname.split('/')[1] ?? null;
    else if (url.searchParams.get('v')) id = url.searchParams.get('v');
    else {
      const partes = url.pathname.split('/');
      const indice = partes.findIndex((p) => ['shorts', 'embed', 'live'].includes(p));
      if (indice >= 0) id = partes[indice + 1] ?? null;
    }
    if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
    return {
      url: crudo.trim(),
      proveedor: 'YouTube',
      embed: `https://www.youtube-nocookie.com/embed/${id}`,
    };
  }

  // Vimeo: vimeo.com/<número>
  if (anfitrion === 'vimeo.com' || anfitrion === 'player.vimeo.com') {
    const id = url.pathname.split('/').find((p) => /^\d{6,}$/.test(p));
    if (!id) return null;
    return { url: crudo.trim(), proveedor: 'Vimeo', embed: `https://player.vimeo.com/video/${id}` };
  }

  if (anfitrion === 'tiktok.com' || anfitrion === 'vm.tiktok.com') {
    return { url: crudo.trim(), proveedor: 'TikTok', embed: null };
  }

  if (anfitrion === 'instagram.com') {
    return { url: crudo.trim(), proveedor: 'Instagram', embed: null };
  }

  return null;
}
