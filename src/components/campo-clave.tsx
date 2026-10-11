'use client';

import { useState } from 'react';

/** Campo de contraseña con "Ver / Ocultar" (en el celu se tipea mal y no se ve). */
export function CampoClave(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [ver, setVer] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={ver ? 'text' : 'password'} className={`campo pr-16 ${props.className ?? ''}`} />
      <button
        type="button"
        className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-tinta-3 hover:text-tinta"
        onClick={() => setVer(!ver)}
        aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {ver ? 'Ocultar' : 'Ver'}
      </button>
    </div>
  );
}
