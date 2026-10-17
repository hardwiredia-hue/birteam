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
        texto: [
          'Con tu ciudad te mostramos partidos, canchas y jugadores de tu zona.',
          'En Inicio, "Arrancá en birteam" te muestra lo que falta para sacarle el jugo (deporte, ciudad, cuándo podés jugar, foto, un grupo, tu primer partido y los avisos en el celular), cada cosa con su atajo. Se va solo cuando está todo, o con "Ahora no".',
        ],
        enlace: { href: '/registro', rotulo: 'Crear cuenta' },
      },
      {
        id: 'perfil-deportivo',
        titulo: 'Tu perfil deportivo: nivel y posición',
        texto: [
          'En Perfil → Mis deportes cargás tu nivel (inicial, intermedio, avanzado o competitivo) y tu posición en cada deporte.',
          'El nivel se usa para sugerirte partidos y para armar equipos parejos.',
          'Ahí mismo, "¿Cuándo podés jugar?": marcá los días y franjas (mañana de 6 a 12, tarde de 12 a 18, noche desde las 18) en que solés poder. Los avisos de partidos que buscan jugadores te llegan solo en esos horarios; si no marcás nada, te llegan todos. En tu perfil lo ven los demás, y en Explorar → Jugadores se puede buscar a los que pueden hoy a esa hora.',
          'En el perfil de otro jugador ves cuántas veces jugaron juntos (partidos ya jugados donde fueron los dos).',
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
          'Ahí mismo elegís qué avisos querés: sociales (me gusta, comentarios, seguidores), charlas de partidos y grupos, Radar, desafíos y partidos que buscan jugadores.',
          'En Notificaciones ves cada aviso con cuándo llegó ("hace 5 min", "ayer"). Al tocar uno se marca como leído; con "Marcar leídos" se marcan todos.',
        ],
        enlace: { href: '/perfil', rotulo: 'Ir a Ajustes' },
      },
      {
        id: 'cerca',
        titulo: 'Ver lo que está cerca tuyo',
        texto: [
          'En Explorar (partidos, canchas y grupos), Buscar turno y el Radar todo se ordena por distancia y cada lugar muestra a cuántos km está.',
          'En Inicio, "Cerca tuyo" te muestra los partidos abiertos de tus deportes que quedan más cerca y a los que todavía no te sumaste.',
          'En Explorar → Partidos, "Para mi nivel" deja los partidos sin nivel sugerido o del nivel que cargaste en ese deporte, y "Les faltan jugadores" los que todavía tienen lugar. Se combinan con el deporte y la distancia.',
          'Se mide desde el centro de la ciudad de tu perfil. Para medir desde donde estás, tocá "Usar mi ubicación" y aceptá el permiso del navegador. Eligiendo 2, 5, 15, 30 o 50 km ves solo lo que queda dentro de esa distancia.',
          'Tu ubicación queda solo en tu navegador, redondeada a unos 100 m, durante 6 horas: no se guarda en tu cuenta ni se muestra a nadie. Con "Usar mi ciudad" la dejás de usar, y se borra al salir de tu cuenta.',
          'En cada cancha, cada partido y cada turno de Reservas, "Cómo llegar" abre el mapa del celular con el destino cargado y te dice a cuántos km está.',
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
          'Costo por jugador (opcional) y si es abierto o solo para tu grupo. Si elegiste una cancha publicada con precio, te sugerimos cuánto pone cada uno: lo que sale el turno ese día a esa hora (con el precio pico si corresponde) dividido el cupo.',
          'Invitá gente: primero te mostramos con quiénes más jugás, después tus seguidores; o buscá a cualquiera por nombre.',
        ],
        texto: [
          'Con "Repetir el último" se carga todo lo de tu partido anterior y te propone la próxima fecha.',
          'Si lo marcás "Se repite todas las semanas", cuando termina armamos solos el de la semana siguiente (mismo lugar, hora, cupo y costo) y avisamos al grupo y a los que jugaron. Si una semana no se juega, cancelá ese partido; para cortar la serie, editá el último y destildá "Se repite".',
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
          'Al pegarlo en WhatsApp (o en redes) se ve una tarjeta con el deporte, el día y la hora, dónde se juega y cuántos faltan. Los links de grupos y torneos también muestran la suya: el nombre, cuántos son y los lugares que quedan.',
          'Para sumar a alguien a un partido ya armado: entrá a su perfil y tocá "Invitar a un partido". Podés invitar a los partidos que organizás, o a los abiertos donde estás confirmado. Le llega el aviso y responde desde su Inicio.',
          'Si faltan jugadores, en tu partido aparece "Pueden venir": gente de ese deporte, cerca, que marcó que puede ese día a esa hora. Los invitás de un toque.',
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
          'Además, al día siguiente del partido (entre 20 y 30 horas después de terminado), a los que jugaron y siguen como "Debe" les llega un solo aviso: "Te falta pagar…", con el nombre de quien organiza.',
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
          'Cuando termina te llega el recordatorio "¿Cómo salió?". Si nadie pasa lista, a las 48 h de terminado lo damos por jugado con todos los confirmados (si llegó al mínimo); lo que ya hayas marcado se respeta.',
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
          'En el partido (si vas o lo organizás) tocá "Agregar al calendario": Google Calendar o el calendario del celular. Va con el lugar y un aviso 1 hora antes.',
          'Para no agregarlos de a uno: en tu perfil, "Tus partidos en tu calendario" crea un link que suma todos tus partidos (los que vas u organizás) y tus turnos, y se actualiza solo. En el iPhone se abre con "iPhone o Outlook"; en Google Calendar, con su botón. El calendario lo vuelve a leer cada tanto (Google puede tardar unas horas).',
          'El link es tuyo: quien lo tenga ve tus partidos. Desde el perfil lo cambiás (el anterior deja de andar) o lo apagás.',
        ],
        enlace: { href: '/perfil', rotulo: 'Ir a mi perfil' },
      },
      {
        id: 'pronostico',
        titulo: 'El pronóstico del partido',
        texto: [
          'En los partidos de los próximos 7 días ves el pronóstico para esa hora: temperatura, cielo y la probabilidad de lluvia mientras se juega (y el viento, si es fuerte).',
          'Si es probable que llueva te lo marcamos: si la cancha es techada, se juega igual; si no, coordinen por el chat del partido. El pronóstico es de Open-Meteo y lo pide tu celular; si no carga, no se muestra.',
        ],
      },
      {
        id: 'chat',
        titulo: 'La charla del partido',
        texto: [
          'Cada partido tiene su chat para los que participan: respondé Voy, Tal vez o No voy y entrás. Los grupos tienen el suyo.',
          'Cuando alguien escribe, les avisamos a los que van, los "tal vez" y la lista de espera (no a los que dijeron No voy): un solo aviso por charla hasta que la abrís, aunque escriban diez mensajes. Se apaga en Perfil → Ajustes → "Charlas de partidos y grupos".',
        ],
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
          'La "Tabla del grupo" muestra, con los partidos del grupo ya jugados, quién jugó más (PJ), su asistencia (fue sobre las veces que dijo Voy) y cuántas veces fue la figura.',
        ],
        enlace: { href: '/grupos/nuevo', rotulo: 'Crear grupo' },
      },
      {
        id: 'cuando-jugamos',
        titulo: '¿Cuándo jugamos? Elegir el horario entre todos',
        pasos: [
          'En el grupo, "¿Cuándo jugamos?" → "Proponer".',
          'Cargá de 2 a 5 días y horarios y tocá "Mandar al grupo": les avisamos a todos.',
          'Cada uno toca los horarios que puede (puede cambiarlos cuando quiera). Ves cuántos y quiénes pueden en cada uno.',
          'Quien la propuso, o un admin, toca "Armar el partido" con el más votado: se abre "Crear partido" con el día y la hora puestos.',
        ],
        texto: [
          'Hay una encuesta abierta por grupo. Se cierra al armar el partido, con "Cerrar sin armar" o sola cuando pasan todos sus horarios.',
          'Mientras no votes, la ves arriba en tu Inicio con el botón "Votar".',
        ],
        enlace: { href: '/grupos', rotulo: 'Ir a mis grupos' },
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
        id: 'como-es',
        titulo: 'Cómo es la cancha: techada, superficie y servicios',
        texto: [
          'En la ficha de cada cancha, "Cómo es" dice si es techada, la superficie (césped sintético, cemento, parquet, polvo de ladrillo…) y los servicios: iluminación, vestuarios, duchas, estacionamiento, buffet y más. Lo carga el complejo.',
          'En Explorar → Canchas, "Solo techadas" deja las que se pueden jugar con lluvia, y también filtrás por iluminación, vestuarios o estacionamiento (se pueden combinar). Con "Más baratas primero" se ordenan por precio por hora.',
        ],
        enlace: { href: '/explorar?tab=canchas&techada=1', rotulo: 'Ver canchas techadas' },
      },
      {
        id: 'pedir-turno',
        titulo: 'Pedir un turno',
        texto: [
          'Elegís el horario en la grilla de la cancha y tocás "Pedir este turno". Se puede reservar hasta 14 días para adelante y hasta 30 minutos antes de que empiece.',
          'Si la cancha no cobra online, el complejo confirma tu pedido (tiene 12 horas; si no contesta, el turno se libera y te avisamos). Se paga en el complejo.',
          'Podés tener hasta 3 pedidos sin confirmar por cancha.',
          'En Reservas → Historial, cada turno jugado tiene "Otra vez": abre la cancha con el mismo día de la semana y la misma hora ya elegidos (el próximo que se pueda reservar).',
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
          'En la cancha, "Pedir fijo": elegís día y hora (y una nota para el complejo) y el complejo lo acepta o te avisa que no puede. Hay un pedido pendiente por cancha; mientras espera, lo podés retirar.',
          'Si el complejo te anota un turno fijo (el mismo día y hora todas las semanas), lo ves en Reservas. Si una semana no van, cancelás solo esa; también podés dejar el fijo.',
        ],
      },
      {
        id: 'resenas',
        titulo: 'Reseñas de canchas',
        texto: [
          'Solo deja reseña quien jugó ahí (turno confirmado o partido en esa cancha). El complejo puede responder.',
          'Después de jugar (entre 1 y 26 horas después de que termina) te llega "¿Cómo estuvo…?" con el atajo a la reseña: una sola vez por cancha, y no si ya la reseñaste o si el complejo marcó que no fuiste.',
        ],
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
        id: 'agenda',
        titulo: 'La agenda del día',
        texto: [
          'Cada mañana (entre las 8 y las 11) te llega "Tu día en el complejo": cuántos turnos confirmados hay hoy y cuántos pedidos esperan respuesta. Solo si hay algo para contar.',
          'Arriba de Mi complejo está la agenda de hoy (y la de mañana): todos los turnos tomados de tus canchas por hora, con quién juega, en qué cancha y el estado (confirmado, turno fijo, pedido sin responder, esperando pago o bloqueado).',
          'Cada turno dice cuánto falta cobrar en el complejo (descontando lo que se pagó online) y tiene el WhatsApp del jugador. Arriba ves el total a cobrar del día, contando solo lo confirmado. Lo que ya pasó queda apagado.',
          'Si hay pedidos sin responder, te avisa: tocá "Responder" para confirmarlo o rechazarlo antes de que se venza.',
        ],
        enlace: { href: '/complejo', rotulo: 'Ir a Mi complejo' },
      },
      {
        id: 'puesta-a-punto',
        titulo: 'Dejar el complejo listo',
        texto: [
          'En Mi complejo, "Tu complejo, listo para recibir reservas" te muestra qué falta (fotos, precio, cómo es cada cancha, teléfono, pedidos online, Mercado Pago, verificación) y te lleva a completarlo.',
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
          'En "¿Cómo es?" marcá si es techada, la superficie y los servicios (vestuarios, iluminación, estacionamiento…): se ve en la ficha y los jugadores filtran por techadas.',
        ],
        texto: [
          'También podés publicarla al crear un partido: en "¿Dónde juegan?" escribí el nombre y la dirección y, en "¿Es tu cancha?", tocá "Sí, cargarla en birteam". Queda con horario de 9 a 23 todos los días; precio, horarios y fotos los completás después desde Mi complejo.',
        ],
        enlace: { href: '/canchas/nueva', rotulo: 'Publicar cancha' },
      },
      {
        id: 'actualizar-precios',
        titulo: 'Actualizar los precios de todas las canchas',
        pasos: [
          'Mi complejo → "Actualizar precios" → "Actualizar".',
          'Elegí el aumento (5, 10, 15 o 20%, u otro número; negativo para bajar) y a qué redondear ($100, $500 o $1.000).',
          'Mirá cómo queda cada cancha y tocá "Aplicar".',
        ],
        texto: [
          'Cambia el precio por hora y el de horario pico de todas tus canchas. Los turnos ya reservados mantienen el precio con el que se pidieron.',
        ],
        enlace: { href: '/complejo', rotulo: 'Mi complejo' },
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
        id: 'clientes',
        titulo: 'Tus clientes',
        texto: [
          'En Mi complejo → "Tus clientes" ves a todos los que reservaron en los últimos 6 meses: cuántos turnos jugaron, cuánto sumaron, faltas, si tienen turno reservado o fijo y cuándo vinieron por última vez. Se busca por nombre y tiene el WhatsApp de cada uno.',
          '"Hace rato que no vienen" junta a los que vinieron al menos 2 veces, no vuelven hace más de 30 días y no tienen turno: un mensaje a tiempo los trae de vuelta.',
          'Con "Descargar la lista (Excel)" te llevás todo en una planilla que abre Excel o Google Sheets.',
          'Lo ve solo el dueño (tus empleados no ven lo que gastó cada cliente).',
        ],
        enlace: { href: '/complejo/clientes', rotulo: 'Ver mis clientes' },
      },
      {
        id: 'cerrar-dia',
        titulo: 'Cerrar un día (feriado, mantenimiento)',
        pasos: [
          'En la cancha, abajo de la grilla: "Cerrar un día" → "Elegir día".',
          'Elegí el día (de los próximos 14) y el motivo: feriado, mantenimiento, evento privado o lluvia.',
          'Si tenés varias canchas, marcá "Todas las canchas del complejo" para cerrarlas juntas.',
        ],
        texto: [
          'Se bloquean de una todos los turnos libres de ese día (y salen del Radar). Lo que ya estaba reservado no se toca: te lo listamos para que avises o canceles uno por uno (si pagaron online, al cancelar se devuelve).',
          'Para deshacerlo, tocá "Abrir" al lado del día: se sacan solo los bloqueos del cierre; los que pusiste a mano quedan.',
        ],
      },
      {
        id: 'turnos-fijos',
        titulo: 'Turnos fijos',
        texto: [
          'Los jugadores también te piden turno fijo desde la cancha: te llega el aviso y en la cancha, arriba de tus turnos fijos, ves cada pedido con el historial del que pide. "Aceptar" arma el fijo a su nombre; "No puedo" le avisa.',
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
          'En su Inicio ven la agenda del complejo (hoy y mañana) igual que vos: quién juega, en qué cancha, si está confirmado, cuánto cobrar y el WhatsApp.',
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
          'Avisos: a quien organiza, cada equipo que se anota (y cuando se llena el cupo); a los capitanes, cuando arranca, cada resultado de su equipo y el campeón.',
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
  ['partidos', 'calendario'],
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
    fecha: '2026-10-17',
    titulo: 'Recordatorio de pago automático',
    texto: 'Al día siguiente del partido, a los que todavía no pagaron les llega un aviso. Quien organiza ya no tiene que perseguir a nadie.',
    para: 'jugadores',
    enlace: { href: '/ayuda/partidos#pagos', rotulo: 'Cómo funciona' },
  },
  {
    fecha: '2026-10-17',
    titulo: 'Cuánto pone cada uno',
    texto: 'Al armar un partido en una cancha publicada te sugerimos el costo por jugador según lo que sale el turno. Y en Explorar podés ver las canchas más baratas primero.',
    para: 'jugadores',
    enlace: { href: '/ayuda/partidos#crear-partido', rotulo: 'Ver más' },
  },
  {
    fecha: '2026-10-17',
    titulo: 'Completá tu partido',
    texto: 'Si faltan jugadores, tu partido te muestra quiénes pueden venir (cerca, de ese deporte y libres a esa hora) para invitarlos de un toque.',
    para: 'jugadores',
    enlace: { href: '/ayuda/partidos#invitar', rotulo: 'Cómo funciona' },
  },
  {
    fecha: '2026-10-17',
    titulo: 'Decí cuándo podés jugar',
    texto: 'Marcá tus días y horarios en Mis deportes: los avisos de partidos que buscan jugadores te llegan cuando podés ir.',
    para: 'jugadores',
    enlace: { href: '/perfil/deportes', rotulo: 'Marcar mis horarios' },
  },
  {
    fecha: '2026-10-17',
    titulo: 'Pedí tu turno fijo',
    texto: '¿Juegan siempre el mismo día? Pedile a la cancha un turno fijo y el complejo lo acepta con un toque.',
    para: 'todos',
    enlace: { href: '/ayuda/canchas-y-turnos#turno-fijo-jugador', rotulo: 'Cómo funciona' },
  },
  {
    fecha: '2026-10-17',
    titulo: 'Tu día, a primera hora',
    texto: 'Cada mañana te avisamos cuántos turnos confirmados tenés hoy y cuántos pedidos esperan tu respuesta.',
    para: 'complejos',
    enlace: { href: '/ayuda/complejos#agenda', rotulo: 'Ver más' },
  },
  {
    fecha: '2026-10-17',
    titulo: 'Aumentos de una',
    texto: 'Desde Mi complejo actualizás el precio de todas las canchas con un porcentaje y redondeo, viendo cómo queda cada una antes de aplicarlo.',
    para: 'complejos',
    enlace: { href: '/ayuda/complejos#actualizar-precios', rotulo: 'Cómo se hace' },
  },
  {
    fecha: '2026-10-17',
    titulo: 'Partidos para tu nivel',
    texto: 'En Explorar, filtrá los partidos de tu nivel y los que todavía buscan jugadores.',
    para: 'jugadores',
    enlace: { href: '/explorar?solo=nivel,faltan', rotulo: 'Probalo' },
  },
  {
    fecha: '2026-10-17',
    titulo: 'Torneos con avisos',
    texto: 'Te avisamos cuando se anota un equipo, cuando arranca el torneo, cada resultado de tu equipo y quién salió campeón.',
    para: 'jugadores',
    enlace: { href: '/ayuda/torneos#jugar-torneo', rotulo: 'Ver más' },
  },
  {
    fecha: '2026-10-17',
    titulo: 'Tabla del grupo',
    texto: 'Quién juega más con el grupo, su asistencia y las veces que fue figura. Y en cada perfil, cuántas veces jugaron juntos.',
    para: 'jugadores',
    enlace: { href: '/ayuda/grupos#crear-grupo', rotulo: 'Ver más' },
  },
  {
    fecha: '2026-10-17',
    titulo: 'Reservar otra vez',
    texto: 'En tu historial de turnos, "Otra vez" abre la cancha con el mismo día y hora de la semana que viene.',
    para: 'jugadores',
    enlace: { href: '/ayuda/canchas-y-turnos#pedir-turno', rotulo: 'Cómo funciona' },
  },
  {
    fecha: '2026-10-16',
    titulo: 'Partidos que se cierran solos',
    texto: 'Al terminar, el organizador recibe "¿Cómo salió?" para pasar lista. Si no lo hace, a las 48 h el partido se da por jugado y suma a las estadísticas.',
    para: 'jugadores',
    enlace: { href: '/ayuda/partidos#pasar-lista', rotulo: 'Cómo funciona' },
  },
  {
    fecha: '2026-10-16',
    titulo: '¿Cómo estuvo la cancha?',
    texto: 'Después de jugar te pedimos la reseña, una sola vez por cancha. Complejos: más reseñas, más reservas.',
    para: 'todos',
    enlace: { href: '/ayuda/canchas-y-turnos#resenas', rotulo: 'Cómo funciona' },
  },
  {
    fecha: '2026-10-16',
    titulo: 'Arrancá en birteam',
    texto: 'En Inicio, los pasos para que birteam te sirva de verdad: tu deporte, tu ciudad, un grupo y tu primer partido.',
    para: 'jugadores',
    enlace: { href: '/ayuda/primeros-pasos#crear-cuenta', rotulo: 'Ver más' },
  },
  {
    fecha: '2026-10-16',
    titulo: '¿Cuándo jugamos?',
    texto: 'En el grupo proponés de 2 a 5 horarios, cada uno marca los que puede y armás el partido con el más votado.',
    para: 'jugadores',
    enlace: { href: '/ayuda/grupos#cuando-jugamos', rotulo: 'Cómo funciona' },
  },
  {
    fecha: '2026-10-16',
    titulo: 'Tus clientes',
    texto: 'Quiénes reservan, cuánto vienen, la última vez y quiénes hace rato que no vuelven, con su WhatsApp a mano.',
    para: 'complejos',
    enlace: { href: '/ayuda/complejos#clientes', rotulo: 'Cómo funciona' },
  },
  {
    fecha: '2026-10-16',
    titulo: 'Cerrar un día de una',
    texto: 'Feriado o mantenimiento: desde la cancha bloqueás todos los turnos libres del día (una o todas las canchas) y te listamos lo que ya estaba reservado.',
    para: 'complejos',
    enlace: { href: '/ayuda/complejos#cerrar-dia', rotulo: 'Cómo se hace' },
  },
  {
    fecha: '2026-10-16',
    titulo: 'Te avisamos cuando escriben en la charla',
    texto: 'En la charla de tus partidos y grupos: un aviso por charla hasta que la abrís, sin llenarte el celular.',
    para: 'jugadores',
    enlace: { href: '/ayuda/partidos#chat', rotulo: 'Cómo funciona' },
  },
  {
    fecha: '2026-10-16',
    titulo: 'Partidos semanales de verdad',
    texto: 'Si el partido "se repite todas las semanas", al terminar armamos el de la semana siguiente y avisamos al grupo y a los que jugaron.',
    para: 'jugadores',
    enlace: { href: '/ayuda/partidos#crear-partido', rotulo: 'Cómo funciona' },
  },
  {
    fecha: '2026-10-16',
    titulo: 'Tus partidos en tu calendario',
    texto: 'Un link desde tu perfil suma todos tus partidos y turnos a Google Calendar o al del iPhone, y se actualiza solo.',
    para: 'todos',
    enlace: { href: '/ayuda/partidos#calendario', rotulo: 'Cómo sincronizarlo' },
  },
  {
    fecha: '2026-10-16',
    titulo: 'El pronóstico en cada partido',
    texto: 'Temperatura y probabilidad de lluvia para la hora del partido, en los de los próximos 7 días.',
    para: 'jugadores',
    enlace: { href: '/ayuda/partidos#pronostico', rotulo: 'Ver más' },
  },
  {
    fecha: '2026-10-16',
    titulo: 'Canchas techadas y sus servicios',
    texto: 'Cada cancha dice si es techada, su superficie y sus servicios; en Explorar podés ver solo las techadas. Complejos: completalo en Editar cancha.',
    para: 'todos',
    enlace: { href: '/ayuda/canchas-y-turnos#como-es', rotulo: 'Cómo es la cancha' },
  },
  {
    fecha: '2026-10-16',
    titulo: 'Links que se ven mejor en WhatsApp',
    texto: 'Al compartir un partido, un grupo o un torneo, la vista previa ya dice qué es, cuándo y cuántos faltan, con una imagen de birteam.',
    para: 'todos',
    enlace: { href: '/ayuda/partidos#invitar', rotulo: 'Cómo compartir' },
  },
  {
    fecha: '2026-10-13',
    titulo: 'La agenda del día',
    texto: 'Arriba de Mi complejo (y en el Inicio de tus empleados), los turnos de hoy y mañana por hora: quién juega, en qué cancha, si está confirmado, cuánto falta cobrar y su WhatsApp.',
    para: 'complejos',
    enlace: { href: '/ayuda/complejos#agenda', rotulo: 'Cómo funciona' },
  },
  {
    fecha: '2026-10-13',
    titulo: 'Invitá desde el perfil',
    texto: 'En el perfil de cualquier jugador, "Invitar a un partido": elegís uno de tus próximos partidos y le llega la invitación.',
    para: 'jugadores',
    enlace: { href: '/ayuda/partidos#invitar', rotulo: 'Cómo invitar' },
  },
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
