/**
 * Verificación de dueños de cancha.
 *
 * CUIT/CUIL: 11 dígitos con dígito verificador módulo 11. No prueba que el
 * número sea de la persona, pero descarta números inventados al voleo; la
 * prueba de titularidad es el comprobante que revisa administración.
 */
export function validarCuit(crudo: string) {
  const digitos = crudo.replace(/\D/g, '');
  if (digitos.length !== 11) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((total, peso, indice) => total + peso * Number(digitos[indice]), 0);
  const resto = suma % 11;
  const verificador = resto === 0 ? 0 : resto === 1 ? 9 : 11 - resto;
  return verificador === Number(digitos[10]);
}

/** Deja el CUIT prolijo: 20-12345678-3. */
export function formatearCuit(crudo: string) {
  const digitos = crudo.replace(/\D/g, '');
  if (digitos.length !== 11) return crudo;
  return `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}`;
}

export const ESTADOS_VERIFICACION: Record<string, string> = {
  PENDIENTE: 'Pendiente: falta el comprobante',
  EN_REVISION: 'En revisión',
  VERIFICADA: 'Verificada',
  RECHAZADA: 'Rechazada: revisá el comprobante y volvé a subirlo',
};
