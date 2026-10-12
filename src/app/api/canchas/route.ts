import { NextResponse } from 'next/server';
import { coordenadasDelLugar } from '@/lib/coordenadas';
import { prisma } from '@/lib/db';
import { usuarioActual } from '@/lib/auth';
import { suscripcionActiva } from '@/lib/suscripcion';
import { esquemaCancha, erroresDeZod } from '@/lib/validacion';
import { nombresEnSerie } from '@/lib/serie';

/** Publicar una cancha: solo cuentas de dueño con suscripción activa. */
export async function POST(request: Request) {
  const usuario = await usuarioActual();
  if (!usuario) return NextResponse.json({ error: 'Entrá primero.' }, { status: 401 });
  if (usuario.tipoCuenta !== 'CANCHA') {
    return NextResponse.json(
      { error: 'Para publicar canchas necesitás una cuenta de dueño de cancha.' },
      { status: 403 }
    );
  }
  if (!suscripcionActiva(usuario)) {
    return NextResponse.json(
      { error: 'Tu suscripción no está activa. Escribinos a hola@birteam.com para activarla.' },
      { status: 403 }
    );
  }

  const cuerpo = await request.json().catch(() => null);
  const datos = esquemaCancha.safeParse(cuerpo);
  if (!datos.success) {
    return NextResponse.json(
      { error: 'Revisá los datos marcados.', detalles: erroresDeZod(datos.error) },
      { status: 400 }
    );
  }
  const d = datos.data;

  const deporte = await prisma.deporte.findUnique({ where: { id: d.deporteId } });
  if (!deporte) return NextResponse.json({ error: 'Ese deporte no existe.' }, { status: 400 });

  const nombres = nombresEnSerie(d.nombre, d.cantidad);
  if (nombres.some((nombre) => nombre.length > 80)) {
    return NextResponse.json(
      { error: 'Revisá los datos marcados.', detalles: { nombre: ['El nombre es muy largo.'] } },
      { status: 400 }
    );
  }
  // Sin punto en el mapa (por ejemplo, publicada desde "crear partido"): el
  // centro de su ciudad, para que aparezca en "cerca tuyo".
  const punto =
    d.latitud != null && d.longitud != null
      ? { latitud: d.latitud, longitud: d.longitud }
      : await coordenadasDelLugar({ ciudad: d.ciudad, provincia: d.provincia });
  // Una o varias iguales: todas o ninguna.
  const creadas = await prisma.$transaction(
    nombres.map((nombre) =>
      prisma.cancha.create({
        data: {
          duenoId: usuario.id,
          nombre,
          descripcion: d.descripcion ?? null,
          deporteId: d.deporteId,
          direccion: d.direccion,
          ciudad: d.ciudad ?? null,
          provincia: d.provincia ?? null,
          pais: d.pais,
          latitud: punto?.latitud ?? null,
          longitud: punto?.longitud ?? null,
          precioPorHora: d.precioPorHora ?? null,
          telefono: d.telefono ?? null,
          fotos: JSON.stringify(d.fotos.map((nombre) => `/api/archivos/${nombre}`)),
          diasDisponibles: JSON.stringify([...new Set(d.diasDisponibles)].sort()),
          horaApertura: d.horaApertura,
          horaCierre: d.horaCierre,
          duracionTurno: d.duracionTurno,
          reservasOnline: d.reservasOnline,
          cobroOnline: d.cobroOnline,
          horasCancelacion: d.horasCancelacion,
          precioPico: d.precioPico ?? null,
          picoDesdeHora: d.precioPico != null ? (d.picoDesdeHora ?? null) : null,
          picoFinDeSemana: d.precioPico != null ? d.picoFinDeSemana : false,
          senaPorcentaje: d.senaPorcentaje,
        },
      })
    )
  );

  return NextResponse.json({ id: creadas[0].id, ids: creadas.map((c) => c.id) }, { status: 201 });
}
