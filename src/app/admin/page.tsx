import { prisma } from '@/lib/db';

export const metadata = { title: 'Backoffice' };
export const dynamic = 'force-dynamic';

export default async function Metricas() {
  const hace7 = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const ahora = new Date();

  const [
    usuarios,
    usuariosSemana,
    grupos,
    partidos,
    jugados,
    jugadosSemana,
    proximos,
    mensajes,
    denunciasPendientes,
  ] = await Promise.all([
    prisma.usuario.count(),
    prisma.usuario.count({ where: { creadoEn: { gte: hace7 } } }),
    prisma.grupo.count(),
    prisma.partido.count(),
    prisma.partido.count({ where: { estado: 'JUGADO' } }),
    prisma.partido.count({ where: { estado: 'JUGADO', fecha: { gte: hace7 } } }),
    prisma.partido.count({
      where: { estado: { in: ['ARMANDOSE', 'CONFIRMADO'] }, fecha: { gte: ahora } },
    }),
    prisma.mensaje.count(),
    prisma.denuncia.count({ where: { estado: 'PENDIENTE' } }),
  ]);

  // Canchas y turnos: solo conteos observados en la base, nada estimado.
  const hace30 = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [
    duenos,
    duenosActivos,
    canchasPublicadas,
    turnosPedidos30,
    turnosConfirmados30,
    turnosRadar30,
    turnosCancelados30,
    pedidosVencidos30,
    ofertasActivas,
    desafiosAceptados30,
    resenas,
  ] = await Promise.all([
    prisma.usuario.count({ where: { tipoCuenta: 'CANCHA' } }),
    prisma.usuario.count({ where: { tipoCuenta: 'CANCHA', suscripcionHasta: { gt: ahora } } }),
    prisma.cancha.count({ where: { activa: true, dueno: { suscripcionHasta: { gt: ahora } } } }),
    prisma.reserva.count({ where: { creadoEn: { gte: hace30 }, estado: { not: 'BLOQUEO' } } }),
    prisma.reserva.count({ where: { creadoEn: { gte: hace30 }, estado: 'CONFIRMADA' } }),
    prisma.reserva.count({ where: { creadoEn: { gte: hace30 }, estado: 'CONFIRMADA', ofertaId: { not: null } } }),
    prisma.reserva.count({ where: { creadoEn: { gte: hace30 }, estado: 'CANCELADA' } }),
    prisma.reserva.count({ where: { creadoEn: { gte: hace30 }, estado: 'VENCIDA' } }),
    prisma.ofertaTurno.count({ where: { inicio: { gt: ahora } } }),
    prisma.desafio.count({ where: { respondidoEn: { gte: hace30 }, estado: 'ACEPTADO' } }),
    prisma.resenaCancha.count(),
  ]);
  const conversion = turnosPedidos30 > 0 ? Math.round((turnosConfirmados30 / turnosPedidos30) * 100) : null;

  return (
    <div className="flex flex-col gap-5">
      <section className="tarjeta p-5">
        <p className="t-rotulo">La métrica norte · partidos jugados esta semana</p>
        <p className="t-display mt-2 text-[44px] text-verde-txt tabular">{jugadosSemana}</p>
        <p className="mt-1 text-xs text-tinta-3">
          Todo lo que hacemos empuja este número. Si no sube, lo demás es decoración.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Cifra valor={usuarios} rotulo="Usuarios" detalle={`+${usuariosSemana} esta semana`} />
        <Cifra valor={grupos} rotulo="Grupos" />
        <Cifra valor={proximos} rotulo="Partidos próximos" />
        <Cifra valor={jugados} rotulo="Jugados (total)" detalle={`de ${partidos} creados`} />
        <Cifra valor={mensajes} rotulo="Mensajes" />
        <Cifra
          valor={denunciasPendientes}
          rotulo="Denuncias pendientes"
          alerta={denunciasPendientes > 0}
        />
      </section>

      <section className="flex flex-col gap-2">
        <p className="t-rotulo">Canchas y turnos · últimos 30 días</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Cifra valor={duenosActivos} rotulo="Complejos activos" detalle={`de ${duenos} registrados`} />
          <Cifra valor={canchasPublicadas} rotulo="Canchas visibles" />
          <Cifra valor={turnosPedidos30} rotulo="Turnos pedidos" />
          <Cifra
            valor={turnosConfirmados30}
            rotulo="Confirmados"
            detalle={conversion != null ? `${conversion}% de los pedidos` : undefined}
          />
          <Cifra valor={turnosRadar30} rotulo="Vendidos por Radar" detalle={`${ofertasActivas} ofertas activas`} />
          <Cifra valor={turnosCancelados30} rotulo="Cancelados" />
          <Cifra
            valor={pedidosVencidos30}
            rotulo="Vencidos sin respuesta"
            alerta={pedidosVencidos30 > 0}
            detalle="complejos que no contestan"
          />
          <Cifra valor={desafiosAceptados30} rotulo="Desafíos aceptados" detalle={`${resenas} reseñas en total`} />
        </div>
        <p className="text-xs text-tinta-3">
          Conteos de la base. Los turnos se pagan en el complejo: todavía no hay facturación ni
          comisiones de la plataforma.
        </p>
      </section>
    </div>
  );
}

function Cifra({
  valor,
  rotulo,
  detalle,
  alerta,
}: {
  valor: number;
  rotulo: string;
  detalle?: string;
  alerta?: boolean;
}) {
  return (
    <div className="tarjeta px-3 py-4 text-center">
      <p
        className="t-display text-[24px] tabular"
        style={alerta ? { color: 'var(--rojo)' } : undefined}
      >
        {valor}
      </p>
      <p className="t-rotulo mt-1 text-[9.5px]">{rotulo}</p>
      {detalle ? <p className="mt-0.5 text-[10px] text-tinta-3">{detalle}</p> : null}
    </div>
  );
}
