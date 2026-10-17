/**
 * Textos de la UI (spec §10: código en inglés, textos en español, centralizados acá).
 * Español neutro, cálido, sin tecnicismos.
 */
export const es = {
  nav: {
    primary: "Navegación principal",
    home: "Inicio",
    explore: "Explorar",
    create: "Crear",
    community: "Comunidad",
    myWork: "Mi tejido",
    search: "Buscar",
    notifications: "Notificaciones",
  },
  common: {
    comingSoon: "Pronto",
    skipToContent: "Saltar al contenido",
  },
  theme: {
    toggle: "Cambiar tema",
    light: "Claro",
    dark: "Oscuro",
    system: "Sistema",
  },
  auth: {
    signIn: "Ingresar",
    signUp: "Crear cuenta",
    stubTitle: "La cuenta llega muy pronto",
    stubBody:
      "El registro, la verificación por email y el ingreso con Google se construyen en la próxima fase. Mientras tanto puedes recorrer esta vista previa.",
    backHome: "Volver al inicio",
  },
  landing: {
    eyebrow: "Comunidad de tejido en español",
    title: "Teje, guarda y comparte todo lo que haces",
    body: "Ovillo es el cuaderno de tejido donde tus proyectos, tus lanas y las personas que tejen cerca viven en un mismo lugar.",
    ctaPrimary: "Explorar",
    ctaSecondary: "Ver la comunidad",
    note: "Estamos tejiendo la primera versión de Ovillo. Muy pronto podrás crear tu cuenta.",
  },
  create: {
    title: "Crear",
    subtitle: "¿Qué quieres agregar?",
    soonBadge: "Pronto",
    note: "Estas acciones se activan en las próximas fases del proyecto.",
    items: {
      project: "Proyecto",
      entry: "Entrada de diario",
      yarn: "Lana al inventario",
      question: "Pregunta",
      pattern: "Patrón",
    },
  },
  explore: {
    title: "Explorar",
    emptyTitle: "Todavía no hay nada para explorar",
    emptyBody:
      "Estamos cargando los primeros patrones, lanas y proyectos. En la próxima fase podrás buscarlos y filtrarlos desde acá.",
  },
  community: {
    title: "Comunidad",
    emptyTitle: "Todavía no hay grupos",
    emptyBody:
      "Los grupos, las preguntas y los tejidos en conjunto llegan en una próxima fase. Van a aparecer acá.",
  },
  myWork: {
    title: "Mi tejido",
    emptyTitle: "Tu cuaderno todavía está vacío",
    emptyBody:
      "Acá van a vivir tus proyectos, tus contadores, tu lana y tus guardados. Se construye en la próxima fase.",
  },
  devUi: {
    title: "Kit de UI",
    note: "Página interna, visible solo en desarrollo.",
    colors: "Colores",
    typography: "Tipografía",
    radii: "Radios",
    buttons: "Botones",
    form: "Formulario",
    badges: "Etiquetas",
    card: "Tarjeta",
    states: "Estados",
  },
} as const;
