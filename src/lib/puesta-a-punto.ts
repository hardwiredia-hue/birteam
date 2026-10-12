/**
 * Puesta a punto del complejo: lo que conviene tener cargado para recibir
 * reservas. Sale de los datos reales; cuando está todo, no se muestra.
 */

export interface Paso {
  clave: string;
  titulo: string;
  detalle: string;
  hecho: boolean;
  href: string;
  /** "Completar" | "Conectar" … texto del botón. */
  accion: string;
}

export function pasosDelComplejo(datos: {
  canchas: {
    id: string;
    fotos: string;
    precioPorHora: number | null;
    telefono: string | null;
    reservasOnline: boolean;
  }[];
  mercadoPagoDisponible: boolean;
  mercadoPagoConectado: boolean;
  verificacion: string;
}): Paso[] {
  const { canchas } = datos;
  const sinFotos = canchas.find((c) => {
    try {
      return (JSON.parse(c.fotos) as unknown[]).length === 0;
    } catch {
      return true;
    }
  });
  const sinPrecio = canchas.find((c) => c.precioPorHora == null);
  const primera = canchas[0];

  const pasos: Paso[] = [
    {
      clave: 'cancha',
      titulo: 'Publicá tu primera cancha',
      detalle: 'Dónde queda, cuánto sale y en qué horarios.',
      hecho: canchas.length > 0,
      href: '/canchas/nueva',
      accion: 'Publicar',
    },
    {
      clave: 'fotos',
      titulo: 'Sumá fotos',
      detalle: 'Las canchas con fotos se eligen mucho más.',
      hecho: canchas.length > 0 && !sinFotos,
      href: sinFotos ? `/canchas/${sinFotos.id}/editar` : '/complejo',
      accion: 'Agregar',
    },
    {
      clave: 'precio',
      titulo: 'Cargá el precio por hora',
      detalle: 'Sin precio, el jugador tiene que preguntar.',
      hecho: canchas.length > 0 && !sinPrecio,
      href: sinPrecio ? `/canchas/${sinPrecio.id}/editar` : '/complejo',
      accion: 'Cargar',
    },
    {
      clave: 'telefono',
      titulo: 'Dejá un teléfono',
      detalle: 'Para consultas y reservas de último momento.',
      hecho: canchas.some((c) => c.telefono),
      href: primera ? `/canchas/${primera.id}/editar` : '/canchas/nueva',
      accion: 'Agregar',
    },
    {
      clave: 'online',
      titulo: 'Prendé los pedidos online',
      detalle: 'Te piden el turno desde la app y lo confirmás vos.',
      hecho: canchas.some((c) => c.reservasOnline),
      href: primera ? `/canchas/${primera.id}/editar` : '/canchas/nueva',
      accion: 'Prender',
    },
  ];
  if (datos.mercadoPagoDisponible) {
    pasos.push({
      clave: 'mercadopago',
      titulo: 'Conectá Mercado Pago',
      detalle: 'Cobrás la seña al reservar y se acaban los “después te aviso”.',
      hecho: datos.mercadoPagoConectado,
      href: '/api/mercadopago/conectar',
      accion: 'Conectar',
    });
  }
  pasos.push({
    clave: 'verificacion',
    titulo: 'Verificá la titularidad',
    detalle:
      datos.verificacion === 'EN_REVISION'
        ? 'Ya lo mandaste: lo estamos revisando.'
        : 'Tu cancha sale con el sello Verificada.',
    // En revisión cuenta como hecho: no depende del dueño.
    hecho: datos.verificacion === 'VERIFICADA' || datos.verificacion === 'EN_REVISION',
    href: '/perfil#verificacion',
    accion: 'Subir',
  });
  return pasos;
}
