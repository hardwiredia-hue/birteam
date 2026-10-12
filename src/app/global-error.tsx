'use client';

/**
 * Último recurso: falló hasta el armado general de la página. Va con estilos
 * propios porque acá puede no haber cargado ni la hoja de estilos.
 */
export default function ErrorGeneral({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es-AR">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0b08',
          color: '#f4f6ea',
          fontFamily: 'system-ui, sans-serif',
          padding: 20,
        }}
      >
        <div style={{ maxWidth: 360 }}>
          <p style={{ color: '#a8e617', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}>birteam</p>
          <h1 style={{ fontSize: 26, margin: '8px 0' }}>Algo salió mal</h1>
          <p style={{ color: '#bbc1a8', fontSize: 15, lineHeight: 1.5 }}>
            No pudimos cargar birteam. Probá de nuevo en un momento.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 16,
              background: '#a8e617',
              color: '#0b0d03',
              border: 0,
              borderRadius: 6,
              padding: '12px 22px',
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
