/**
 * Centro de ayuda: cómo funciona birteam, tema por tema, y las preguntas
 * frecuentes. Es contenido (no se guarda en la base): cada función nueva
 * suma o actualiza su artículo acá (ver CLAUDE.md).
 *
 * Los números que se citan (12 h, 15 min, 14 días…) son los del código.
 */

export interface Articulo {
  id: string;
  titulo: string;
  /** Párrafos. */
  texto: string[];
  /** Pasos numerados, si es un "cómo se hace". */
  pasos?: string[];
  /** Atajo a la pantalla donde se hace. */
  enlace?: { href: string; rotulo: string };
}

export interface Tema {
  slug: string;
  titulo: string;
  descripcion: string;
  para: 'todos' | 'jugadores' | 'complejos';
  icono: 'inicio' | 'partido' | 'grupo' | 'cancha' | 'complejo' | 'torneo' | 'social' | 'cuenta';
  articulos: Articulo[];
}

export const TEMAS: Tema[] = [
  {
    slug: 'primeros-pasos',
    titulo: 'Primeros pasos',
    descripcion: 'Qué es birteam, crear la cuenta y dejarla lista.',
    para: 'todos',
    icono: 'inicio',
    articulos: [
      {
        id: 'que-es',
        titulo: '¿Qué es birteam?',
        texto: [
          'birteam es para organizar partidos con tu gente, encontrar con quién jugar cerca y reservar canchas. Los complejos publican sus canchas, toman turnos y cobran online.',
          'Funciona para fútbol (5, 7 y 11), básquet (5x5 y 3x3), vóley, pádel, tenis, hockey, rugby, handball y deportes como running o ciclismo.',
        ],
      },
      {
        id: 'crear-cuenta',
        titulo: 'Crear la cuenta',
        pasos: [
          'Tocá "Sumate" y elegí si tu cuenta es para jugar o para alquilar tu cancha.',
          'Poné tu nombre: el @usuario se arma solo (si está tomado, te proponemos uno libre).',
          'Elegí hasta 5 deportes (el primero es el principal) y tu ciudad.',
          'Aceptá los términos y listo. También podés entrar con Google.',
        ],
        texto: ['Con tu ciudad te mostramos partidos, canchas y jugadores de tu zona.'],
        enlace: { href: '/registro', rotulo: 'Crear cuenta' },
      },
      {
        id: 'perfil-deportivo',
        titulo: 'Tu perfil deportivo: nivel y posición',
        texto: [
          'En Perfil → Mis deportes cargás tu nivel (inicial, intermedio, avanzado o competitivo) y tu posición en cada deporte.',
          'El nivel se usa para sugerirte partidos y para armar equipos parejos.',
        ],
        enlace: { href: '/perfil/deportes', rotulo: 'Mis deportes' },
      },
      {
        id: 'instalar-app',
        titulo: 'Instalar birteam como app',
        texto: [
          'En el celular, abrí birteam y usá "Agregar a pantalla de inicio" (en iPhone, desde el botón Compartir de Safari). Queda como una app más, sin pasar por ninguna tienda.',
        ],
      },
      {
        id: 'avisos',
        titulo: 'Avisos en el celular',
        texto: [
          'En Perfil → Ajustes prendé "Avisos en este dispositivo" para recibir los avisos aunque la app esté cerrada: lugar liberado, recordatorios, mensajes, turnos.',
          'Ahí mismo elegís qué avisos sociales querés (me gusta, comentarios, seguidores).',
        ],
        enlace: { href: '/perfil', rotulo: 'Ir a Ajustes' },
      },
      {
        id: 'cerca',
        titulo: 'Ver lo que está cerca tuyo',
        texto: [
          'En Explorar (partidos, canchas y grupos), Buscar turno y el Radar todo se ordena por distancia y cada lugar muestra a cuántos km está.',
          'En Inicio, "Cerca tuyo" te muestra los partidos abiertos de tus deportes que quedan más cerca y a los que todavía no te sumaste.',
          'Se mide desde el centro de la ciudad de tu perfil. Para medir desde donde estás, tocá "Usar mi ubicación" y aceptá el permiso del navegador. Eligiendo 2, 5, 15, 30 o 50 km ves solo lo que queda dentro de esa distancia.',
          'Tu ubicación queda solo en tu navegador, redondeada a unos 100 m, durante 6 horas: no se guarda en tu cuenta ni se muestra a nadie. Con "Usar mi ciudad" la dejás de usar, y se borra al salir de tu cuenta.',
          'En cada cancha y cada partido, "Cómo llegar" abre el mapa del celular con el destino cargado y te dice a cuántos km está.',
          'Un partido que no es en una cancha publicada se ubica en el centro de su ciudad: por eso su distancia es aproximada ("en tu zona", "a ~12 km") y "Cómo llegar" usa la dirección que escribió el organizador.',
          'Los avisos de partidos que buscan jugadores y del Radar te llegan hasta la distancia que elijas en Perfil → Ajustes (5, 15, 30 o 50 km desde tu ciudad).',
          'Si dice que no diste permiso, activalo desde el candado de la barra de direcciones (o en los ajustes de ubicación del celular) y probá de nuevo.',
        ],
        enlace: { href: '/explorar', rotulo: 'Ir a Explorar' },
      },
      {
        id: 'sin-senal',
        titulo: '¿Qué pasa si me quedo sin señal?',
        texto: [
          'Las pantallas que ya abriste (Inicio, Reservas, tus partidos, canchas, grupos) quedan guardadas en el celular: sin señal se ven en su última versión, con un aviso arriba. Cuando vuelve la señal se actualizan solas.',
          'Al salir de tu cuenta se borra todo lo guardado.',
        ],
      },
    ],
  },
  {
    slug: 'partidos',
    titulo: 'Partidos',
    descripcion: 'Crear, confirmar, lista de espera, equipos y la figura.',
    para: 'jugadores',
    icono: 'partido',
    articulos: [
      {
        id: 'crear-partido',
        titulo: 'Crear un partido',
        pasos: [
          'Tocá el "+" y elegí el deporte (y el tipo: Fútbol 5, 7 u 11…).',
          'Elegí dónde: buscá la cancha entre las publicadas para ese deporte (te mostramos las que están cerca). Si no está, escribí dónde juegan.',
          'Elegí día y hora; podés hacer que se repita todas las semanas.',
          'Cupo y mínimo: te sugerimos según el deporte (Fútbol 7 → 14).',
          'Costo por jugador (opcional) y si es abierto o solo para tu grupo.',
        ],
        texto: [
          'Con "Repetir el último" se carga todo lo de tu partido anterior y te propone la próxima fecha.',
          'Lo que escribís a mano (un club, una plaza, una cancha que no está en birteam) se usa solo para ese partido: no queda guardado como cancha. Las canchas las publican sus dueños con una cuenta de complejo.',
        ],
        enlace: { href: '/crear', rotulo: 'Crear partido' },
      },
      {
        id: 'confirmar',
        titulo: 'Confirmar: Voy, Tal vez, No voy',
        texto: [
          'En el partido respondés Voy, Tal vez o No voy. En el celular, si todavía no respondiste, abajo tenés siempre a mano cuántos faltan y el botón Voy. Lleno el cupo, los siguientes entran a la lista de espera.',
          'Si alguien se baja, al primero de la lista le llega el aviso y tiene 2 horas para confirmar el lugar; si no contesta, pasa al siguiente. En Inicio lo ves con la cuenta regresiva y lo confirmás con un toque.',
          'Las invitaciones a partidos (de tus grupos o de quien te invitó) también se responden desde Inicio: Voy o No voy, sin entrar al partido.',
          '24 h antes avisamos a los "tal vez" y a los del grupo que no respondieron, y 2 h antes les pedimos que reconfirmen.',
        ],
      },
      {
        id: 'invitar',
        titulo: 'Invitar y compartir',
        texto: [
          '"Compartir el partido" abre el panel con WhatsApp, Telegram, Facebook, X, Email y el link para copiar. El link se abre sin cuenta y deja sumarse en 30 segundos.',
          'Si es un partido abierto y faltan jugadores dentro de las 48 h previas, avisamos a quienes juegan ese deporte cerca: dentro de la distancia que cada uno eligió en sus avisos, o en la misma ciudad (una sola vez).',
        ],
      },
      {
        id: 'equipos',
        titulo: 'Armar equipos',
        texto: [
          'Quien organiza reparte a los confirmados en "Con pechera" y "Sin pechera": parejos (según el nivel que cada uno cargó) o mezclados al azar.',
          'Tocando un nombre lo pasás al otro equipo. Con "Mandar los equipos" se comparten por WhatsApp.',
        ],
      },
      {
        id: 'pagos',
        titulo: 'Llevar la cuenta de quién pagó',
        texto: [
          'Si el partido tiene costo por jugador, quien organiza ve la lista de confirmados y toca a cada uno para marcar "Pagó" o "Debe". Arriba ve lo cobrado y lo que falta.',
          'Con "Recordarles por WhatsApp" se arma el mensaje con los nombres de los que faltan. Cada jugador ve en el partido si ya figura como pagado.',
          'La plata se arregla entre ustedes: birteam solo lleva la cuenta.',
        ],
      },
      {
        id: 'organizar',
        titulo: 'Co-organizador, editar y cancelar',
        texto: [
          'El organizador puede nombrar un co-organizador entre los confirmados: puede editar, pasar lista y armar equipos.',
          'Con "Cerrar la lista" no se anota nadie más aunque sobre cupo: el partido deja de aparecer en Explorar y en los avisos. Los anotados pueden bajarse, y si alguien de la lista de espera tiene un lugar reservado, lo puede tomar. Se reabre con el mismo interruptor.',
          'Editar o cancelar el partido está en el partido mismo; si se cancela, avisamos a todos.',
          'Al editar podés cambiar de cancha o pasar a un lugar escrito a mano; si cambia el día, la hora o el lugar, les avisamos a los anotados. Si el partido tiene un turno reservado en la cancha, primero cancelalo desde Reservas.',
        ],
      },
      {
        id: 'pasar-lista',
        titulo: 'Pasar lista, costo y asistencia',
        texto: [
          'Después del partido, quien organiza pasa lista (quién vino) y puede cargar el resultado. Eso alimenta el % de asistencia de cada perfil.',
          'Si el partido tiene costo, en el partido se marca quién pagó.',
        ],
      },
      {
        id: 'figura',
        titulo: 'La figura del partido',
        texto: [
          'Después del partido, los que jugaron votan a la figura (no vale votarse). La votación dura 72 horas y el voto se puede cambiar hasta que cierra.',
          'Al cerrar se muestra quién fue. En el perfil suma "Figura" las veces que fuiste el más votado con al menos 2 votos.',
        ],
      },
      {
        id: 'calendario',
        titulo: 'Agregar al calendario',
        texto: [
          'En el partido (si vas o lo organizás) tocá "Agregar al calendario": Google Calendar o el calendario del celular. Va con el lugar y un aviso 1 hora antes; los partidos semanales quedan repitiéndose.',
        ],
      },
      {
        id: 'chat',
        titulo: 'La charla del partido',
        texto: ['Cada partido tiene su chat para los que participan: respondé Voy, Tal vez o No voy y entrás.'],
      },
    ],
  },
  {
    slug: 'grupos',
    titulo: 'Grupos y desafíos',
    descripcion: 'Tu gente en un solo lugar y partidos contra otros grupos.',
    para: 'jugadores',
    icono: 'grupo',
    articulos: [
      {
        id: 'crear-grupo',
        titulo: 'Crear un grupo e invitar',
        texto: [
          'Armás el grupo una vez y cada partido sale con un toque. Invitás con un link (por WhatsApp o donde quieras).',
          'Abierto: aparece en Explorar con botón "Sumarme". Cerrado: solo entran con el link.',
        ],
        enlace: { href: '/grupos/nuevo', rotulo: 'Crear grupo' },
      },
      {
        id: 'administrar',
        titulo: 'Administradores y logo',
        texto: [
          'Los administradores editan el grupo, gestionan miembros y suben el logo. Si el único administrador se va, pasa a serlo el miembro más antiguo.',
          'El logo se ve en el grupo, en Explorar y en los desafíos.',
        ],
      },
      {
        id: 'desafios',
        titulo: 'Desafiar a otro grupo',
        texto: [
          'Desde tu grupo, "Desafiar a otro grupo": elegís rival (o lo dejás abierto para el primero que se anime), día, lugar, jugadores por lado y nivel.',
          'El lugar se elige igual que en un partido: buscás entre las canchas publicadas de ese deporte (las cercanas primero) o escribís dónde juegan.',
          'Si el otro grupo acepta, se arma el partido entre los dos.',
        ],
        enlace: { href: '/desafios', rotulo: 'Ver desafíos' },
      },
    ],
  },
  {
    slug: 'canchas-y-turnos',
    titulo: 'Reservar canchas',
    descripcion: 'Buscar turno, pedirlo, pagar, cancelar y el Radar.',
    para: 'jugadores',
    icono: 'cancha',
    articulos: [
      {
        id: 'buscar-turno',
        titulo: 'Buscar turno en todas las canchas',
        texto: [
          'En "Buscar turno" elegís deporte, día y hora y ves las canchas que lo tienen libre ahora, ordenadas por cercanía, con el precio. Tocás un horario y se abre la cancha con el turno elegido.',
          'Lo libre es lo que de verdad está libre: nada de disponibilidad inventada.',
        ],
        enlace: { href: '/turnos', rotulo: 'Buscar turno' },
      },
      {
        id: 'pedir-turno',
        titulo: 'Pedir un turno',
        texto: [
          'Elegís el horario en la grilla de la cancha y tocás "Pedir este turno". Se puede reservar hasta 14 días para adelante y hasta 30 minutos antes de que empiece.',
          'Si la cancha no cobra online, el complejo confirma tu pedido (tiene 12 horas; si no contesta, el turno se libera y te avisamos). Se paga en el complejo.',
          'Podés tener hasta 3 pedidos sin confirmar por cancha.',
        ],
      },
      {
        id: 'pago-online',
        titulo: 'Pagar online con Mercado Pago',
        texto: [
          'Si la cancha cobra online, al pedir el turno pagás la seña o el total con Mercado Pago. El turno queda retenido 15 minutos mientras pagás y se confirma solo cuando el pago se aprueba.',
          'No guardamos datos de tarjetas: el pago se hace en Mercado Pago. La plata va directo al complejo.',
        ],
      },
      {
        id: 'cancelar',
        titulo: 'Cancelar y devoluciones',
        texto: [
          'Desde Reservas cancelás tu turno hasta las horas que fije cada cancha (por defecto, 6 h antes). Si pagaste online, se te devuelve automáticamente.',
          'Después de ese plazo, hablalo con el complejo. Si el complejo cancela, se te devuelve todo.',
        ],
        enlace: { href: '/reservas', rotulo: 'Mis reservas' },
      },
      {
        id: 'avisame',
        titulo: '"Avisame si se libera"',
        texto: [
          'Si el turno que querés está tomado, tocalo y pedí que te avisemos. Si se cancela o se libera, te llega el aviso y lo pedís antes que otro. Podés esperar hasta 10 turnos a la vez.',
        ],
      },
      {
        id: 'radar',
        titulo: 'El Radar: turnos con descuento',
        texto: [
          'Los complejos publican en el Radar los turnos que les quedaron libres, más baratos. Lo pedís igual que cualquier turno, al precio de la oferta.',
        ],
        enlace: { href: '/radar', rotulo: 'Ver el Radar' },
      },
      {
        id: 'turno-fijo-jugador',
        titulo: 'Tener un turno fijo',
        texto: [
          'Si el complejo te anota un turno fijo (el mismo día y hora todas las semanas), lo ves en Reservas. Si una semana no van, cancelás solo esa; también podés dejar el fijo.',
        ],
      },
      {
        id: 'resenas',
        titulo: 'Reseñas de canchas',
        texto: ['Solo deja reseña quien jugó ahí (turno confirmado o partido en esa cancha). El complejo puede responder.'],
      },
      {
        id: 'faltas',
        titulo: '¿Qué es "No vino"?',
        texto: [
          'Después del turno, el complejo puede marcar que no fuiste. Te avisamos para que reclames si fue un error. Si el complejo lo corrige, el aviso se borra solo. Al pedir turnos, los complejos ven tu historial: turnos jugados y faltas.',
        ],
      },
    ],
  },
  {
    slug: 'complejos',
    titulo: 'Para complejos',
    descripcion: 'Publicar canchas, turnos, cobros y el panel del complejo.',
    para: 'complejos',
    icono: 'complejo',
    articulos: [
      {
        id: 'cuenta-complejo',
        titulo: 'Cuenta de complejo y suscripción',
        texto: [
          'Creá la cuenta eligiendo "Alquilar mi cancha". Para publicar canchas necesitás la suscripción activa: escribinos a hola@birteam.com desde el email de tu cuenta.',
          'Verificá la titularidad subiendo la constancia de AFIP/ARCA o una factura del predio: tus canchas salen con el sello Verificada.',
        ],
      },
      {
        id: 'puesta-a-punto',
        titulo: 'Dejar el complejo listo',
        texto: [
          'En Mi complejo, "Tu complejo, listo para recibir reservas" te muestra qué falta (fotos, precio, teléfono, pedidos online, Mercado Pago, verificación) y te lleva a completarlo.',
        ],
        enlace: { href: '/complejo', rotulo: 'Mi complejo' },
      },
      {
        id: 'publicar-cancha',
        titulo: 'Publicar canchas',
        pasos: [
          'Mi complejo → "Publicar otra".',
          'Si ya tenés una, arranca con sus datos ("Copiar los datos de"): cambiá solo lo distinto.',
          'Horario, duración del turno (1 h, 1 h 30 o 2 h), precio y, si querés, precio pico (desde una hora o los fines de semana).',
          '¿Varias iguales? Con "Canchas iguales" publicás hasta 10 de una (Cancha 1, 2, 3…).',
        ],
        texto: [
          'También podés publicarla al crear un partido: en "¿Dónde juegan?" escribí el nombre y la dirección y, en "¿Es tu cancha?", tocá "Sí, cargarla en birteam". Queda con horario de 9 a 23 todos los días; precio, horarios y fotos los completás después desde Mi complejo.',
        ],
        enlace: { href: '/canchas/nueva', rotulo: 'Publicar cancha' },
      },
      {
        id: 'gestionar-turnos',
        titulo: 'La grilla: confirmar, bloquear y cancelar',
        texto: [
          'En la grilla de cada cancha ves quién tiene cada turno. Los pedidos se confirman o rechazan (tenés 12 h). Tocando un turno libre lo bloqueás (reserva por teléfono, mantenimiento).',
          'En cada pedido ves el historial de quien pide: turnos jugados y faltas.',
        ],
      },
      {
        id: 'turnos-fijos',
        titulo: 'Turnos fijos',
        texto: [
          'En la cancha, "Turnos fijos": el mismo día y horario todas las semanas para un equipo o cliente. Se reserva solo semana a semana; si una semana no vienen, liberás solo esa.',
          'Si le ponés el @usuario, el jugador lo ve en sus reservas y puede avisar si una semana no va. Si una semana ya estaba tomada, no se pisa y te avisamos.',
        ],
      },
      {
        id: 'radar-complejo',
        titulo: 'Publicar en el Radar',
        texto: [
          'Tocá un turno libre en la grilla y publicalo con descuento: le avisamos a quienes juegan ese deporte cerca de tu complejo (según la distancia que eligió cada uno). Si alguien lo toma, deja de aparecer.',
        ],
      },
      {
        id: 'cobro-online',
        titulo: 'Cobrar online con Mercado Pago',
        texto: [
          'En Mi complejo conectás tu cuenta de Mercado Pago y en cada cancha elegís cobrar la seña o el turno completo. El turno se confirma solo al aprobarse el pago y la plata va directo a tu cuenta.',
          'Si cancelás vos, o el jugador dentro de tu política de cancelación, se devuelve automáticamente.',
        ],
      },
      {
        id: 'equipo-complejo',
        titulo: 'Tu equipo: empleados',
        texto: [
          'Sumá hasta 10 personas por su @usuario. Gestionan los turnos (confirmar, rechazar, bloquear, cancelar) y reciben los avisos; no cambian precios, Radar ni cobros.',
        ],
      },
      {
        id: 'no-vino',
        titulo: 'Marcar "No vino"',
        texto: [
          'En Reservas → "Ya jugados" marcás si alguien no fue (hasta 14 días después, con deshacer). Queda en su historial, que ven los complejos al recibir pedidos.',
        ],
      },
      {
        id: 'ocupacion',
        titulo: 'Qué horarios se llenan',
        texto: [
          'Mi complejo muestra el mapa de ocupación de las últimas 4 semanas (días × horas): dónde conviene precio pico y qué franjas quedan vacías para el Radar o un turno fijo.',
          'También descargás el informe de reservas en CSV (Excel o Google Sheets).',
        ],
      },
    ],
  },
  {
    slug: 'torneos',
    titulo: 'Torneos',
    descripcion: 'Ligas y copas con fixture, tabla y campeón.',
    para: 'todos',
    icono: 'torneo',
    articulos: [
      {
        id: 'crear-torneo',
        titulo: 'Crear un torneo: liga o copa',
        texto: [
          'Liga: todos contra todos, gana el que suma más puntos (3 por ganar, 1 por empatar). Copa: eliminación directa, el que pierde queda afuera.',
          'De 2 a 24 equipos. Compartí el link del torneo para que los capitanes anoten sus equipos.',
        ],
        enlace: { href: '/torneos/nuevo', rotulo: 'Armar torneo' },
      },
      {
        id: 'jugar-torneo',
        titulo: 'Fixture, cuadro y resultados',
        texto: [
          'Al arrancar se genera el fixture (liga) o se sortea el cuadro (copa; si no da justo, algunos pasan directo a la segunda ronda).',
          'Quien organiza carga los resultados. En copa, si empatan, se cargan los penales; cada ronda se arma sola y con la final hay campeón.',
        ],
      },
      {
        id: 'logo-equipo',
        titulo: 'Logo del equipo',
        texto: ['El capitán sube el logo desde el torneo: se ve en la tabla, el fixture y la página pública.'],
      },
    ],
  },
  {
    slug: 'social',
    titulo: 'BirtSocial y mensajes',
    descripcion: 'Jugadas, clips, seguir, comentar y mensajes.',
    para: 'jugadores',
    icono: 'social',
    articulos: [
      {
        id: 'jugadas',
        titulo: 'Subir jugadas y clips',
        texto: [
          'En BirtSocial subís fotos, videos cortos o un link de YouTube, TikTok, Instagram o Vimeo. Las fotos se achican solas para que suban rápido.',
          'En Clips ves los videos en pantalla completa, uno atrás del otro.',
        ],
        enlace: { href: '/birtsocial', rotulo: 'Ir a BirtSocial' },
      },
      {
        id: 'seguir',
        titulo: 'Seguir, comentar y compartir',
        texto: ['Seguí jugadores para ver sus jugadas. Comentá, dale me gusta o compartí con el panel de redes.'],
      },
      {
        id: 'mensajes',
        titulo: 'Mensajes',
        texto: ['Desde el perfil de un jugador, "Mensaje": para coordinar un partido, sumar un refuerzo o lo que haga falta.'],
      },
    ],
  },
  {
    slug: 'cuenta',
    titulo: 'Cuenta y privacidad',
    descripcion: 'Contraseña, bloquear, reportar y cerrar la cuenta.',
    para: 'todos',
    icono: 'cuenta',
    articulos: [
      {
        id: 'contrasena',
        titulo: 'Olvidé mi contraseña',
        texto: ['En Entrar, "¿Olvidaste tu contraseña?": te mandamos un link al email para elegir una nueva.'],
        enlace: { href: '/recuperar', rotulo: 'Recuperar contraseña' },
      },
      {
        id: 'bloquear',
        titulo: 'Bloquear o reportar',
        texto: [
          'Desde el perfil de alguien podés bloquearlo (no te ve ni te escribe) o reportarlo. Los reportes los revisa el equipo de birteam.',
        ],
      },
      {
        id: 'cerrar-cuenta',
        titulo: 'Cerrar la cuenta',
        texto: [
          'En Perfil, al final, "Eliminar mi cuenta". Se borran tus datos personales y tu contenido; en los partidos de otros quedás como "Usuario eliminado".',
          'Antes hay que resolver los turnos que tengas por delante (cancelarlos, así se devuelve lo pagado). Los complejos terminan antes sus turnos fijos.',
        ],
      },
      {
        id: 'datos',
        titulo: '¿Qué datos guardan?',
        texto: ['Lo justo para que la app funcione. El detalle está en la política de privacidad.'],
        enlace: { href: '/privacidad', rotulo: 'Privacidad' },
      },
    ],
  },
];

/** Las preguntas que más se hacen (tema/artículo). */
export const FRECUENTES: [string, string][] = [
  ['primeros-pasos', 'cerca'],
  ['canchas-y-turnos', 'pedir-turno'],
  ['canchas-y-turnos', 'cancelar'],
  ['partidos', 'confirmar'],
  ['canchas-y-turnos', 'pago-online'],
  ['partidos', 'crear-partido'],
  ['complejos', 'cuenta-complejo'],
  ['primeros-pasos', 'avisos'],
  ['cuenta', 'contrasena'],
];

export function buscarArticulo(slug: string, id: string) {
  const tema = TEMAS.find((t) => t.slug === slug);
  const articulo = tema?.articulos.find((a) => a.id === id);
  return tema && articulo ? { tema, articulo } : null;
}

/**
 * Novedades: lo nuevo que el usuario nota, lo más reciente primero. Cada
 * función nueva suma su línea acá (ver CLAUDE.md).
 */
export interface Novedad {
  fecha: string;
  titulo: string;
  texto: string;
  para: 'todos' | 'jugadores' | 'complejos';
  /** Para leer más: el artículo de ayuda o la pantalla. */
  enlace?: { href: string; rotulo: string };
}

export const NOVEDADES: Novedad[] = [
  {
    fecha: '2026-10-12',
    titulo: 'Cerrar la lista',
    texto: 'Quien organiza puede cerrar la lista cuando ya tiene a su gente: no se anota nadie más y el partido deja de aparecer en Explorar.',
    para: 'jugadores',
    enlace: { href: '/ayuda/partidos#organizar', rotulo: 'Cómo funciona' },
  },
  {
    fecha: '2026-10-12',
    titulo: 'Voy, siempre a mano',
    texto: 'En el celular, al abrir un partido que todavía no respondiste, abajo ves cuántos faltan y el botón Voy, sin bajar hasta el final.',
    para: 'jugadores',
  },
  {
    fecha: '2026-10-12',
    titulo: 'Quién pagó, a la vista',
    texto:
      'Quien organiza marca quién pagó su parte, ve lo cobrado y lo que falta, y les manda un recordatorio por WhatsApp a los que deben.',
    para: 'jugadores',
    enlace: { href: '/ayuda/partidos#pagos', rotulo: 'Cómo funciona' },
  },
  {
    fecha: '2026-10-12',
    titulo: 'Respondé desde Inicio',
    texto:
      'Si se libera un lugar para vos, lo ves arriba de todo con la cuenta regresiva para confirmarlo. Y las invitaciones a partidos se contestan ahí mismo: Voy o No voy.',
    para: 'jugadores',
    enlace: { href: '/ayuda/partidos#confirmar', rotulo: 'Cómo funciona la lista de espera' },
  },
  {
    fecha: '2026-10-12',
    titulo: 'Elegí la cancha buscándola',
    texto:
      'Al crear un partido, un desafío o al editarlo, buscás la cancha entre las publicadas de tu deporte (las cercanas primero). Si no está, escribís dónde juegan. Si sos dueño, cargás tu cancha ahí mismo.',
    para: 'todos',
    enlace: { href: '/ayuda/partidos#crear-partido', rotulo: 'Cómo crear un partido' },
  },
  {
    fecha: '2026-10-12',
    titulo: 'Cerca tuyo',
    texto:
      'Usá la ubicación del celular para ver partidos, canchas, grupos y turnos ordenados por distancia, con filtro de 2 a 50 km. En Inicio, los partidos abiertos más cercanos.',
    para: 'jugadores',
    enlace: { href: '/ayuda/primeros-pasos#cerca', rotulo: 'Ver lo que está cerca' },
  },
  {
    fecha: '2026-10-12',
    titulo: 'Avisos según la distancia',
    texto:
      'Los avisos de partidos que buscan jugadores y del Radar te llegan hasta la distancia que elijas en Perfil → Ajustes, aunque sea en otra ciudad.',
    para: 'jugadores',
    enlace: { href: '/perfil', rotulo: 'Ir a Ajustes' },
  },
  {
    fecha: '2026-10-12',
    titulo: 'Cómo llegar',
    texto: 'Cada cancha y cada partido tienen "Cómo llegar": abre el mapa con el destino y te dice a cuántos km está.',
    para: 'todos',
  },
  {
    fecha: '2026-10-12',
    titulo: 'Centro de ayuda',
    texto: 'Cómo funciona cada parte de birteam, con buscador y preguntas frecuentes.',
    para: 'todos',
  },
  {
    fecha: '2026-10-12',
    titulo: 'Funciona sin señal',
    texto: 'Las pantallas que ya abriste se ven igual sin conexión, con un aviso arriba. Y las fotos se achican antes de subir: suben rápido con datos.',
    para: 'todos',
    enlace: { href: '/ayuda/primeros-pasos#sin-senal', rotulo: 'Más sobre esto' },
  },
  {
    fecha: '2026-10-12',
    titulo: 'Torneos en formato copa',
    texto: 'Además de liga, eliminación directa con cuadro sorteado y penales.',
    para: 'jugadores',
    enlace: { href: '/ayuda/torneos#crear-torneo', rotulo: 'Crear un torneo' },
  },
  {
    fecha: '2026-10-12',
    titulo: 'Figura del partido y equipos parejos',
    texto: 'Después de jugar, los que jugaron votan la figura. Antes, el organizador arma los equipos parejos por nivel o mezclados.',
    para: 'jugadores',
    enlace: { href: '/ayuda/partidos#equipos', rotulo: 'Armar equipos' },
  },
  {
    fecha: '2026-10-12',
    titulo: 'Logos de equipos',
    texto: 'Los grupos y los equipos de torneo pueden subir su escudo.',
    para: 'jugadores',
    enlace: { href: '/ayuda/torneos#logo-equipo', rotulo: 'Subir el logo' },
  },
  {
    fecha: '2026-10-12',
    titulo: 'Buscar turno en todas las canchas',
    texto: 'Elegís deporte, día y hora y ves las canchas con ese turno libre, todas a la vez. Y podés agregar partidos y turnos a tu calendario.',
    para: 'jugadores',
    enlace: { href: '/turnos', rotulo: 'Buscar turno' },
  },
  {
    fecha: '2026-10-12',
    titulo: 'Puesta a punto y mapa de ocupación',
    texto: 'El panel del complejo te dice qué falta para recibir reservas y muestra la ocupación por día y hora.',
    para: 'complejos',
    enlace: { href: '/ayuda/complejos#puesta-a-punto', rotulo: 'Puesta a punto' },
  },
  {
    fecha: '2026-10-11',
    titulo: 'Turnos fijos, "Avisame si se libera" y "No vino"',
    texto:
      'Los complejos anotan turnos fijos semanales y marcan quién no vino. Los jugadores piden que les avisemos si se libera un turno tomado.',
    para: 'todos',
    enlace: { href: '/ayuda/complejos#turnos-fijos', rotulo: 'Turnos fijos' },
  },
];
