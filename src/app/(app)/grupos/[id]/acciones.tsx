'use client';

import { useState } from 'react';

export function CopiarInvitacion({ ruta }: { ruta: string }) {
  const [copiado, setCopiado] = useState(false);

  async function invitar() {
    const url = `${window.location.origin}${ruta}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Sumate a mi grupo en birteam', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Canceló el share: nada que hacer.
    }
  }

  return (
    <button type="button" className="btn btn-secundario" onClick={invitar}>
      {copiado ? 'Link copiado ✓' : 'Invitar gente'}
    </button>
  );
}
