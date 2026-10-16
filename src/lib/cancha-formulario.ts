import type { Cancha } from '@prisma/client';
import type { CanchaExistente } from '@/components/formulario-cancha';
import { diasDeLaCancha } from './reservas';
import { leerServicios } from './servicios-cancha';

/** Una cancha guardada, en la forma que usa el formulario (editar o copiar). */
export function canchaParaFormulario(cancha: Cancha): CanchaExistente {
  let fotos: string[] = [];
  try {
    fotos = JSON.parse(cancha.fotos);
  } catch {
    fotos = [];
  }
  return {
    id: cancha.id,
    nombre: cancha.nombre,
    descripcion: cancha.descripcion,
    deporteId: cancha.deporteId,
    direccion: cancha.direccion,
    ciudad: cancha.ciudad,
    provincia: cancha.provincia,
    telefono: cancha.telefono,
    precioPorHora: cancha.precioPorHora,
    fotos,
    diasDisponibles: diasDeLaCancha(cancha.diasDisponibles),
    horaApertura: cancha.horaApertura,
    horaCierre: cancha.horaCierre,
    duracionTurno: cancha.duracionTurno,
    reservasOnline: cancha.reservasOnline,
    cobroOnline: cancha.cobroOnline,
    horasCancelacion: cancha.horasCancelacion,
    precioPico: cancha.precioPico,
    picoDesdeHora: cancha.picoDesdeHora,
    picoFinDeSemana: cancha.picoFinDeSemana,
    senaPorcentaje: cancha.senaPorcentaje,
    techada: cancha.techada,
    superficie: cancha.superficie,
    servicios: leerServicios(cancha.servicios),
    activa: cancha.activa,
  };
}
