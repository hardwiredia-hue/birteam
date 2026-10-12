import { diaDeSemana, diasDeLaCancha, horariosDelDia } from './reservas';

/**
 * Ocupación por franja: para cada día de la semana y hora, qué parte de los
 * turnos ofrecidos en las últimas semanas terminó tomada (reservada,
 * confirmada o bloqueada por el complejo). Sale de reservas reales.
 */

export interface CanchaParaOcupacion {
  id: string;
  diasDisponibles: string;
  horaApertura: number;
  horaCierre: number;
  duracionTurno: number;
}

export interface Franja {
  /** 0=domingo … 6=sábado */
  dia: number;
  hora: number;
  ofrecidos: number;
  tomados: number;
}

/** Fechas de la ventana (claves "YYYY-MM-DD") y turnos tomados en ella. */
export function ocupacionPorFranja(
  canchas: CanchaParaOcupacion[],
  fechas: string[],
  tomadas: { canchaId: string; fecha: string; hora: string }[]
) {
  const franjas = new Map<string, Franja>();
  const clave = (dia: number, hora: number) => `${dia}|${hora}`;
  const tomadasPorTurno = new Set(tomadas.map((t) => `${t.canchaId}|${t.fecha}|${t.hora}`));

  for (const cancha of canchas) {
    const abiertos = diasDeLaCancha(cancha.diasDisponibles);
    const horarios = horariosDelDia(cancha);
    for (const fecha of fechas) {
      const dia = diaDeSemana(fecha);
      if (!abiertos.includes(dia)) continue;
      for (const horario of horarios) {
        // Turnos de 90 min arrancan a y media: se agrupan por la hora en que empiezan.
        const hora = Number(horario.slice(0, 2));
        const franja = franjas.get(clave(dia, hora)) ?? { dia, hora, ofrecidos: 0, tomados: 0 };
        franja.ofrecidos++;
        if (tomadasPorTurno.has(`${cancha.id}|${fecha}|${horario}`)) franja.tomados++;
        franjas.set(clave(dia, hora), franja);
      }
    }
  }

  const lista = [...franjas.values()];
  // Filas de corrido entre la primera y la última hora (las que no abren quedan en blanco).
  const conTurnos = lista.map((f) => f.hora);
  const horas =
    conTurnos.length > 0
      ? Array.from({ length: Math.max(...conTurnos) - Math.min(...conTurnos) + 1 }, (_, i) => Math.min(...conTurnos) + i)
      : [];
  const ofrecidos = lista.reduce((suma, f) => suma + f.ofrecidos, 0);
  const tomados = lista.reduce((suma, f) => suma + f.tomados, 0);
  // Para sugerir, solo franjas con al menos 2 turnos ofrecidos (una sola semana no dice nada).
  const comparables = lista.filter((f) => f.ofrecidos >= 2);
  const porTasa = [...comparables].sort((a, b) => b.tomados / b.ofrecidos - a.tomados / a.ofrecidos || b.ofrecidos - a.ofrecidos);
  return {
    franja: (dia: number, hora: number) => franjas.get(clave(dia, hora)) ?? null,
    horas,
    ofrecidos,
    tomados,
    masPedidas: porTasa.filter((f) => f.tomados > 0).slice(0, 3),
    masFlojas: [...porTasa].reverse().filter((f) => f.tomados / f.ofrecidos < 0.25).slice(0, 3),
  };
}
