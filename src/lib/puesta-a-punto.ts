import { leerServicios } from './servicios-cancha';

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
    techada: boolean;
    superficie: string | null;
    servicios: string;
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
  // "Cómo es": cargado si dice algo (techada, superficie o algún servicio).
  const sinDetalle = canchas.find((c) => !c.techada && !c.superficie && leerServicios(c.servicios).length === 0);
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
      clave: 'como-es',
      titulo: 'Contá cómo es cada cancha',
      detalle: 'Techada, superficie y servicios: muchos buscan techadas cuando llueve.',
      hecho: canchas.length > 0 && !sinDetalle,
      href: sinDetalle ? `/canchas/${sinDetalle.id}/editar` : '/complejo',
      accion: 'Completar',
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

/**
 * Primeros pasos de un jugador en Inicio: lo que hace que birteam le sirva
 * (que lo encuentren, que le lleguen los partidos). Sale de sus datos.
 */
export function pasosDelJugador(datos: {
  deportes: number;
  ciudad: string | null;
  avatarUrl: string | null;
  grupos: number;
  partidos: number;
  avisosEnElCelular: boolean;
  /** Marcó cuándo puede jugar. */
  disponibilidad: boolean;
}): Paso[] {
  return [
    {
      clave: 'deporte',
      titulo: 'Contá qué jugás',
      detalle: 'Deporte, nivel y posición: así te invitan a partidos que te van.',
      hecho: datos.deportes > 0,
      href: '/perfil/deportes',
      accion: 'Elegir',
    },
    {
      clave: 'ciudad',
      titulo: 'Decí dónde jugás',
      detalle: 'Para mostrarte partidos y canchas cerca.',
      hecho: Boolean(datos.ciudad),
      href: '/perfil/editar',
      accion: 'Elegir',
    },
    {
      clave: 'disponibilidad',
      titulo: 'Decí cuándo podés jugar',
      detalle: 'Así te avisamos de partidos en los horarios que te sirven.',
      hecho: datos.disponibilidad,
      href: '/perfil/deportes',
      accion: 'Marcar',
    },
    {
      clave: 'foto',
      titulo: 'Poné una foto',
      detalle: 'Que te reconozcan en la lista del partido.',
      hecho: Boolean(datos.avatarUrl),
      href: '/perfil/editar',
      accion: 'Subir',
    },
    {
      clave: 'grupo',
      titulo: 'Sumate a un grupo',
      detalle: 'O armá el tuyo: cada partido sale con un toque.',
      hecho: datos.grupos > 0,
      href: '/explorar?tab=grupos',
      accion: 'Buscar',
    },
    {
      clave: 'partido',
      titulo: 'Anotate en tu primer partido',
      detalle: 'Hay partidos abiertos a los que les faltan jugadores.',
      hecho: datos.partidos > 0,
      href: '/explorar',
      accion: 'Ver',
    },
    {
      clave: 'avisos',
      titulo: 'Prendé los avisos en el celular',
      detalle: 'Te enterás al toque si se libera un lugar o te invitan.',
      hecho: datos.avisosEnElCelular,
      href: '/perfil',
      accion: 'Prender',
    },
  ];
}
