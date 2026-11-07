import { SERVICE_CATALOG } from "./service-catalog.ts";
/** Profession packs for offline pocket booking. Tattoo pack preserves Peyman's exact labels. */

export type PocketLocale = "fa" | "en";

export type BookingFieldId = string;

export type BookingField = {
  id: BookingFieldId;
  /** Maps into PocketBooking storage keys where applicable */
  storeAs:
    | "name"
    | "phone"
    | "style"
    | "placement"
    | "time"
    | "sizeCm"
    | "priceToman"
    | "photo"
    | "note"
    | "details";
  labelFa: string;
  labelEn: string;
  placeholderFa: string;
  placeholderEn: string;
  kind: "text" | "tel" | "time" | "numeric" | "file" | "textarea";
  required?: boolean;
};

export type ProfessionId = string;
export type ProfessionCategoryId = string;

export type ProfessionPack = {
  id: ProfessionId;
  categoryId: ProfessionCategoryId;
  nameFa: string;
  nameEn: string;
  appTitleFa: string;
  appTitleEn: string;
  customerLabelFa: string;
  customerLabelEn: string;
  traineesLabelFa: string;
  traineesLabelEn: string;
  cashLabelFa: string;
  cashLabelEn: string;
  calendarLabelFa: string;
  calendarLabelEn: string;
  addBookingFa: string;
  addBookingEn: string;
  emptyDayFa: string;
  emptyDayEn: string;
  offlineHintFa: string;
  offlineHintEn: string;
  /** Only tattoo artist + studio owner email may sync from server */
  allowsServerSync: boolean;
  fields: BookingField[];
};

export type ProfessionCategory = {
  id: ProfessionCategoryId;
  nameFa: string;
  nameEn: string;
  professionIds: ProfessionId[];
};

const tattooFields: BookingField[] = [
  {
    id: "name",
    storeAs: "name",
    labelFa: "اسم مشتری",
    labelEn: "Customer name",
    placeholderFa: "اسم مشتری",
    placeholderEn: "Customer name",
    kind: "text",
    required: true,
  },
  {
    id: "phone",
    storeAs: "phone",
    labelFa: "موبایل",
    labelEn: "Mobile",
    placeholderFa: "موبایل",
    placeholderEn: "Mobile",
    kind: "tel",
  },
  {
    id: "style",
    storeAs: "style",
    labelFa: "طرح",
    labelEn: "Design",
    placeholderFa: "طرح",
    placeholderEn: "Design",
    kind: "text",
  },
  {
    id: "placement",
    storeAs: "placement",
    labelFa: "محل روی بدن",
    labelEn: "Body placement",
    placeholderFa: "محل روی بدن",
    placeholderEn: "Body placement",
    kind: "text",
  },
  {
    id: "time",
    storeAs: "time",
    labelFa: "ساعت",
    labelEn: "Time",
    placeholderFa: "",
    placeholderEn: "",
    kind: "time",
  },
  {
    id: "size",
    storeAs: "sizeCm",
    labelFa: "اندازه طرح به سانتی‌متر",
    labelEn: "Size (cm)",
    placeholderFa: "اندازه طرح به سانتی‌متر",
    placeholderEn: "Size in cm",
    kind: "text",
  },
  {
    id: "price",
    storeAs: "priceToman",
    labelFa: "قیمت به تومان",
    labelEn: "Price (toman)",
    placeholderFa: "قیمت به تومان",
    placeholderEn: "Price in toman",
    kind: "numeric",
  },
  {
    id: "photo",
    storeAs: "photo",
    labelFa: "عکس طرح",
    labelEn: "Design photo",
    placeholderFa: "",
    placeholderEn: "",
    kind: "file",
  },
  {
    id: "note",
    storeAs: "note",
    labelFa: "یادداشت",
    labelEn: "Note",
    placeholderFa: "یادداشت",
    placeholderEn: "Note",
    kind: "textarea",
  },
];

function serviceFields(opts: {
  serviceFa: string;
  serviceEn: string;
  placeFa: string;
  placeEn: string;
  photoFa?: string;
  photoEn?: string;
}): BookingField[] {
  return [
    {
      id: "name",
      storeAs: "name",
      labelFa: "نام مراجع",
      labelEn: "Client name",
      placeholderFa: "نام مراجع",
      placeholderEn: "Client name",
      kind: "text",
      required: true,
    },
    {
      id: "phone",
      storeAs: "phone",
      labelFa: "موبایل",
      labelEn: "Mobile",
      placeholderFa: "موبایل",
      placeholderEn: "Mobile",
      kind: "tel",
    },
    {
      id: "service",
      storeAs: "style",
      labelFa: opts.serviceFa,
      labelEn: opts.serviceEn,
      placeholderFa: opts.serviceFa,
      placeholderEn: opts.serviceEn,
      kind: "text",
    },
    {
      id: "placement",
      storeAs: "placement",
      labelFa: opts.placeFa,
      labelEn: opts.placeEn,
      placeholderFa: opts.placeFa,
      placeholderEn: opts.placeEn,
      kind: "text",
    },
    {
      id: "time",
      storeAs: "time",
      labelFa: "ساعت",
      labelEn: "Time",
      placeholderFa: "",
      placeholderEn: "",
      kind: "time",
    },
    {
      id: "price",
      storeAs: "priceToman",
      labelFa: "مبلغ به تومان",
      labelEn: "Amount (toman)",
      placeholderFa: "مبلغ به تومان",
      placeholderEn: "Amount in toman",
      kind: "numeric",
    },
    {
      id: "photo",
      storeAs: "photo",
      labelFa: opts.photoFa || "عکس پیوست",
      labelEn: opts.photoEn || "Attachment photo",
      placeholderFa: "",
      placeholderEn: "",
      kind: "file",
    },
    {
      id: "note",
      storeAs: "note",
      labelFa: "یادداشت",
      labelEn: "Note",
      placeholderFa: "یادداشت",
      placeholderEn: "Note",
      kind: "textarea",
    },
  ];
}

const LEGACY_CATEGORIES: ProfessionCategory[] = [
  {
    id: "beauty",
    nameFa: "زیبایی و آرایش",
    nameEn: "Beauty",
    professionIds: ["tattoo_artist", "barber", "beautician", "nail_tech"],
  },
  {
    id: "health",
    nameFa: "سلامت و درمان",
    nameEn: "Health",
    professionIds: ["doctor", "dentist", "physiotherapist", "psychologist", "veterinarian"],
  },
  {
    id: "education",
    nameFa: "آموزش و مربیگری",
    nameEn: "Education",
    professionIds: ["tutor", "fitness_coach", "music_teacher"],
  },
  {
    id: "trades",
    nameFa: "تعمیرات و خدمات فنی",
    nameEn: "Trades",
    professionIds: ["mechanic", "electrician", "plumber", "hvac"],
  },
  { id: "legal", nameFa: "حقوقی و اداری", nameEn: "Legal", professionIds: ["lawyer"] },
  {
    id: "creative",
    nameFa: "هنر و خلاقیت",
    nameEn: "Creative",
    professionIds: ["photographer", "tailor"],
  },
  { id: "other", nameFa: "سایر خدمات", nameEn: "Other services", professionIds: ["other_service"] },
];

const LEGACY_PACKS: Record<ProfessionId, ProfessionPack> = {
  tattoo_artist: {
    id: "tattoo_artist",
    categoryId: "beauty",
    nameFa: "تاتو آرتیست",
    nameEn: "Tattoo artist",
    appTitleFa: "تقویم نوبت تاتو",
    appTitleEn: "Tattoo appointment calendar",
    customerLabelFa: "مشتری",
    customerLabelEn: "Customer",
    traineesLabelFa: "هنرجوها",
    traineesLabelEn: "Apprentices",
    cashLabelFa: "صندوق",
    cashLabelEn: "Cash box",
    calendarLabelFa: "تقویم",
    calendarLabelEn: "Calendar",
    addBookingFa: "ثبت نوبت همین روز",
    addBookingEn: "Add appointment for this day",
    emptyDayFa: "این روز خالی است.",
    emptyDayEn: "This day is empty.",
    offlineHintFa: "این نوبت‌ها روی خود گوشی می‌مانند. بدون اینترنت هم دیده و ویرایش می‌شوند.",
    offlineHintEn: "Appointments stay on this phone and work offline.",
    allowsServerSync: true,
    fields: tattooFields,
  },
  barber: {
    id: "barber",
    categoryId: "beauty",
    nameFa: "آرایشگر مردانه",
    nameEn: "Barber",
    appTitleFa: "تقویم نوبت آرایشگاه",
    appTitleEn: "Barbershop calendar",
    customerLabelFa: "مشتری",
    customerLabelEn: "Client",
    traineesLabelFa: "کارآموزها",
    traineesLabelEn: "Trainees",
    cashLabelFa: "صندوق",
    cashLabelEn: "Cash box",
    calendarLabelFa: "تقویم",
    calendarLabelEn: "Calendar",
    addBookingFa: "ثبت نوبت همین روز",
    addBookingEn: "Add appointment for this day",
    emptyDayFa: "این روز خالی است.",
    emptyDayEn: "This day is empty.",
    offlineHintFa: "نوبت‌ها روی گوشی می‌مانند و بدون اینترنت کار می‌کنند.",
    offlineHintEn: "Appointments stay on device and work offline.",
    allowsServerSync: false,
    fields: serviceFields({
      serviceFa: "خدمت (اصلاح، رنگ، …)",
      serviceEn: "Service",
      placeFa: "صندلی / جایگاه",
      placeEn: "Chair / station",
    }),
  },
  beautician: {
    id: "beautician",
    categoryId: "beauty",
    nameFa: "آرایشگر و زیبایی",
    nameEn: "Beautician",
    appTitleFa: "تقویم نوبت زیبایی",
    appTitleEn: "Beauty calendar",
    customerLabelFa: "مشتری",
    customerLabelEn: "Client",
    traineesLabelFa: "کارآموزها",
    traineesLabelEn: "Trainees",
    cashLabelFa: "صندوق",
    cashLabelEn: "Cash box",
    calendarLabelFa: "تقویم",
    calendarLabelEn: "Calendar",
    addBookingFa: "ثبت نوبت همین روز",
    addBookingEn: "Add appointment for this day",
    emptyDayFa: "این روز خالی است.",
    emptyDayEn: "This day is empty.",
    offlineHintFa: "نوبت‌ها روی گوشی می‌مانند و بدون اینترنت کار می‌کنند.",
    offlineHintEn: "Appointments stay on device and work offline.",
    allowsServerSync: false,
    fields: serviceFields({
      serviceFa: "خدمت زیبایی",
      serviceEn: "Beauty service",
      placeFa: "بخش / اتاق",
      placeEn: "Room / station",
      photoFa: "عکس قبل/بعد",
      photoEn: "Before/after photo",
    }),
  },
  nail_tech: {
    id: "nail_tech",
    categoryId: "beauty",
    nameFa: "ناخن‌کار",
    nameEn: "Nail technician",
    appTitleFa: "تقویم نوبت ناخن",
    appTitleEn: "Nail calendar",
    customerLabelFa: "مشتری",
    customerLabelEn: "Client",
    traineesLabelFa: "کارآموزها",
    traineesLabelEn: "Trainees",
    cashLabelFa: "صندوق",
    cashLabelEn: "Cash box",
    calendarLabelFa: "تقویم",
    calendarLabelEn: "Calendar",
    addBookingFa: "ثبت نوبت همین روز",
    addBookingEn: "Add appointment for this day",
    emptyDayFa: "این روز خالی است.",
    emptyDayEn: "This day is empty.",
    offlineHintFa: "نوبت‌ها روی گوشی می‌مانند و بدون اینترنت کار می‌کنند.",
    offlineHintEn: "Appointments stay on device and work offline.",
    allowsServerSync: false,
    fields: serviceFields({
      serviceFa: "نوع کار ناخن",
      serviceEn: "Nail service",
      placeFa: "میز / جایگاه",
      placeEn: "Table / station",
    }),
  },
  doctor: {
    id: "doctor",
    categoryId: "health",
    nameFa: "پزشک",
    nameEn: "Doctor",
    appTitleFa: "تقویم ویزیت پزشکی",
    appTitleEn: "Clinic calendar",
    customerLabelFa: "بیمار",
    customerLabelEn: "Patient",
    traineesLabelFa: "کارآموزان",
    traineesLabelEn: "Trainees",
    cashLabelFa: "صندوق",
    cashLabelEn: "Cash box",
    calendarLabelFa: "تقویم",
    calendarLabelEn: "Calendar",
    addBookingFa: "ثبت ویزیت همین روز",
    addBookingEn: "Add visit for this day",
    emptyDayFa: "این روز خالی است.",
    emptyDayEn: "This day is empty.",
    offlineHintFa: "ویزیت‌ها روی گوشی می‌مانند و بدون اینترنت کار می‌کنند.",
    offlineHintEn: "Visits stay on device and work offline.",
    allowsServerSync: false,
    fields: serviceFields({
      serviceFa: "نوع ویزیت",
      serviceEn: "Visit type",
      placeFa: "شکایت اصلی / موضوع",
      placeEn: "Chief complaint",
    }),
  },
  dentist: {
    id: "dentist",
    categoryId: "health",
    nameFa: "دندان‌پزشک",
    nameEn: "Dentist",
    appTitleFa: "تقویم نوبت دندان‌پزشکی",
    appTitleEn: "Dental calendar",
    customerLabelFa: "بیمار",
    customerLabelEn: "Patient",
    traineesLabelFa: "کارآموزان",
    traineesLabelEn: "Trainees",
    cashLabelFa: "صندوق",
    cashLabelEn: "Cash box",
    calendarLabelFa: "تقویم",
    calendarLabelEn: "Calendar",
    addBookingFa: "ثبت نوبت همین روز",
    addBookingEn: "Add appointment for this day",
    emptyDayFa: "این روز خالی است.",
    emptyDayEn: "This day is empty.",
    offlineHintFa: "نوبت‌ها روی گوشی می‌مانند و بدون اینترنت کار می‌کنند.",
    offlineHintEn: "Appointments stay on device and work offline.",
    allowsServerSync: false,
    fields: serviceFields({
      serviceFa: "نوع درمان",
      serviceEn: "Treatment",
      placeFa: "دندان / ناحیه",
      placeEn: "Tooth / area",
    }),
  },
  physiotherapist: {
    id: "physiotherapist",
    categoryId: "health",
    nameFa: "فیزیوتراپیست",
    nameEn: "Physiotherapist",
    appTitleFa: "تقویم جلسه فیزیوتراپی",
    appTitleEn: "Physio calendar",
    customerLabelFa: "مراجع",
    customerLabelEn: "Client",
    traineesLabelFa: "کارآموزان",
    traineesLabelEn: "Trainees",
    cashLabelFa: "صندوق",
    cashLabelEn: "Cash box",
    calendarLabelFa: "تقویم",
    calendarLabelEn: "Calendar",
    addBookingFa: "ثبت جلسه همین روز",
    addBookingEn: "Add session for this day",
    emptyDayFa: "این روز خالی است.",
    emptyDayEn: "This day is empty.",
    offlineHintFa: "جلسه‌ها روی گوشی می‌مانند و بدون اینترنت کار می‌کنند.",
    offlineHintEn: "Sessions stay on device and work offline.",
    allowsServerSync: false,
    fields: serviceFields({
      serviceFa: "نوع جلسه",
      serviceEn: "Session type",
      placeFa: "ناحیه بدن",
      placeEn: "Body area",
    }),
  },
  psychologist: {
    id: "psychologist",
    categoryId: "health",
    nameFa: "روان‌شناس / مشاور",
    nameEn: "Psychologist",
    appTitleFa: "تقویم جلسه مشاوره",
    appTitleEn: "Counseling calendar",
    customerLabelFa: "مراجع",
    customerLabelEn: "Client",
    traineesLabelFa: "کارآموزان",
    traineesLabelEn: "Trainees",
    cashLabelFa: "صندوق",
    cashLabelEn: "Cash box",
    calendarLabelFa: "تقویم",
    calendarLabelEn: "Calendar",
    addBookingFa: "ثبت جلسه همین روز",
    addBookingEn: "Add session for this day",
    emptyDayFa: "این روز خالی است.",
    emptyDayEn: "This day is empty.",
    offlineHintFa: "جلسه‌ها روی گوشی می‌مانند و بدون اینترنت کار می‌کنند.",
    offlineHintEn: "Sessions stay on device and work offline.",
    allowsServerSync: false,
    fields: serviceFields({
      serviceFa: "نوع جلسه",
      serviceEn: "Session type",
      placeFa: "موضوع جلسه",
      placeEn: "Session topic",
    }),
  },
  veterinarian: {
    id: "veterinarian",
    categoryId: "health",
    nameFa: "دام‌پزشک",
    nameEn: "Veterinarian",
    appTitleFa: "تقویم نوبت دام‌پزشکی",
    appTitleEn: "Vet calendar",
    customerLabelFa: "صاحب حیوان",
    customerLabelEn: "Pet owner",
    traineesLabelFa: "کارآموزان",
    traineesLabelEn: "Trainees",
    cashLabelFa: "صندوق",
    cashLabelEn: "Cash box",
    calendarLabelFa: "تقویم",
    calendarLabelEn: "Calendar",
    addBookingFa: "ثبت نوبت همین روز",
    addBookingEn: "Add appointment for this day",
    emptyDayFa: "این روز خالی است.",
    emptyDayEn: "This day is empty.",
    offlineHintFa: "نوبت‌ها روی گوشی می‌مانند و بدون اینترنت کار می‌کنند.",
    offlineHintEn: "Appointments stay on device and work offline.",
    allowsServerSync: false,
    fields: serviceFields({
      serviceFa: "نوع ویزیت",
      serviceEn: "Visit type",
      placeFa: "نام / نوع حیوان",
      placeEn: "Pet name / type",
    }),
  },
  tutor: {
    id: "tutor",
    categoryId: "education",
    nameFa: "مدرس / معلم خصوصی",
    nameEn: "Tutor",
    appTitleFa: "تقویم جلسه آموزش",
    appTitleEn: "Tutoring calendar",
    customerLabelFa: "هنرجو",
    customerLabelEn: "Student",
    traineesLabelFa: "هنرجوها",
    traineesLabelEn: "Students",
    cashLabelFa: "صندوق",
    cashLabelEn: "Cash box",
    calendarLabelFa: "تقویم",
    calendarLabelEn: "Calendar",
    addBookingFa: "ثبت جلسه همین روز",
    addBookingEn: "Add session for this day",
    emptyDayFa: "این روز خالی است.",
    emptyDayEn: "This day is empty.",
    offlineHintFa: "جلسه‌ها روی گوشی می‌مانند و بدون اینترنت کار می‌کنند.",
    offlineHintEn: "Sessions stay on device and work offline.",
    allowsServerSync: false,
    fields: [
      {
        id: "name",
        storeAs: "name",
        labelFa: "نام هنرجو",
        labelEn: "Student name",
        placeholderFa: "نام هنرجو",
        placeholderEn: "Student name",
        kind: "text",
        required: true,
      },
      {
        id: "phone",
        storeAs: "phone",
        labelFa: "موبایل",
        labelEn: "Mobile",
        placeholderFa: "موبایل",
        placeholderEn: "Mobile",
        kind: "tel",
      },
      {
        id: "sessionTopic",
        storeAs: "style",
        labelFa: "موضوع جلسه",
        labelEn: "Topic",
        placeholderFa: "موضوع جلسه",
        placeholderEn: "Topic",
        kind: "text",
      },
      {
        id: "level",
        storeAs: "placement",
        labelFa: "سطح",
        labelEn: "Level",
        placeholderFa: "سطح",
        placeholderEn: "Level",
        kind: "text",
      },
      {
        id: "time",
        storeAs: "time",
        labelFa: "ساعت",
        labelEn: "Time",
        placeholderFa: "",
        placeholderEn: "",
        kind: "time",
      },
      {
        id: "price",
        storeAs: "priceToman",
        labelFa: "شهریه جلسه به تومان",
        labelEn: "Session fee",
        placeholderFa: "شهریه جلسه به تومان",
        placeholderEn: "Session fee",
        kind: "numeric",
      },
      {
        id: "note",
        storeAs: "note",
        labelFa: "یادداشت پیشرفت",
        labelEn: "Progress note",
        placeholderFa: "یادداشت پیشرفت",
        placeholderEn: "Progress note",
        kind: "textarea",
      },
    ],
  },
  fitness_coach: {
    id: "fitness_coach",
    categoryId: "education",
    nameFa: "مربی ورزشی",
    nameEn: "Fitness coach",
    appTitleFa: "تقویم جلسه تمرین",
    appTitleEn: "Training calendar",
    customerLabelFa: "ورزشکار",
    customerLabelEn: "Athlete",
    traineesLabelFa: "کارآموزها",
    traineesLabelEn: "Trainees",
    cashLabelFa: "صندوق",
    cashLabelEn: "Cash box",
    calendarLabelFa: "تقویم",
    calendarLabelEn: "Calendar",
    addBookingFa: "ثبت جلسه همین روز",
    addBookingEn: "Add session for this day",
    emptyDayFa: "این روز خالی است.",
    emptyDayEn: "This day is empty.",
    offlineHintFa: "جلسه‌ها روی گوشی می‌مانند و بدون اینترنت کار می‌کنند.",
    offlineHintEn: "Sessions stay on device and work offline.",
    allowsServerSync: false,
    fields: serviceFields({
      serviceFa: "نوع تمرین",
      serviceEn: "Workout type",
      placeFa: "هدف جلسه",
      placeEn: "Session goal",
    }),
  },
  music_teacher: {
    id: "music_teacher",
    categoryId: "education",
    nameFa: "معلم موسیقی",
    nameEn: "Music teacher",
    appTitleFa: "تقویم جلسه موسیقی",
    appTitleEn: "Music lesson calendar",
    customerLabelFa: "هنرجو",
    customerLabelEn: "Student",
    traineesLabelFa: "هنرجوها",
    traineesLabelEn: "Students",
    cashLabelFa: "صندوق",
    cashLabelEn: "Cash box",
    calendarLabelFa: "تقویم",
    calendarLabelEn: "Calendar",
    addBookingFa: "ثبت جلسه همین روز",
    addBookingEn: "Add session for this day",
    emptyDayFa: "این روز خالی است.",
    emptyDayEn: "This day is empty.",
    offlineHintFa: "جلسه‌ها روی گوشی می‌مانند و بدون اینترنت کار می‌کنند.",
    offlineHintEn: "Sessions stay on device and work offline.",
    allowsServerSync: false,
    fields: serviceFields({
      serviceFa: "ساز / درس",
      serviceEn: "Instrument / lesson",
      placeFa: "سطح",
      placeEn: "Level",
    }),
  },
  mechanic: {
    id: "mechanic",
    categoryId: "trades",
    nameFa: "مکانیک خودرو",
    nameEn: "Auto mechanic",
    appTitleFa: "تقویم نوبت تعمیرگاه",
    appTitleEn: "Garage calendar",
    customerLabelFa: "مشتری",
    customerLabelEn: "Customer",
    traineesLabelFa: "کارآموزها",
    traineesLabelEn: "Trainees",
    cashLabelFa: "صندوق",
    cashLabelEn: "Cash box",
    calendarLabelFa: "تقویم",
    calendarLabelEn: "Calendar",
    addBookingFa: "ثبت نوبت همین روز",
    addBookingEn: "Add appointment for this day",
    emptyDayFa: "این روز خالی است.",
    emptyDayEn: "This day is empty.",
    offlineHintFa: "نوبت‌ها روی گوشی می‌مانند و بدون اینترنت کار می‌کنند.",
    offlineHintEn: "Appointments stay on device and work offline.",
    allowsServerSync: false,
    fields: [
      {
        id: "name",
        storeAs: "name",
        labelFa: "نام مشتری",
        labelEn: "Customer name",
        placeholderFa: "نام مشتری",
        placeholderEn: "Customer name",
        kind: "text",
        required: true,
      },
      {
        id: "phone",
        storeAs: "phone",
        labelFa: "موبایل",
        labelEn: "Mobile",
        placeholderFa: "موبایل",
        placeholderEn: "Mobile",
        kind: "tel",
      },
      {
        id: "vehicle",
        storeAs: "style",
        labelFa: "خودرو / پلاک",
        labelEn: "Vehicle / plate",
        placeholderFa: "خودرو / پلاک",
        placeholderEn: "Vehicle / plate",
        kind: "text",
      },
      {
        id: "placement",
        storeAs: "placement",
        labelFa: "مشکل / خدمت",
        labelEn: "Issue / service",
        placeholderFa: "مشکل / خدمت",
        placeholderEn: "Issue / service",
        kind: "text",
      },
      {
        id: "time",
        storeAs: "time",
        labelFa: "ساعت",
        labelEn: "Time",
        placeholderFa: "",
        placeholderEn: "",
        kind: "time",
      },
      {
        id: "price",
        storeAs: "priceToman",
        labelFa: "برآورد به تومان",
        labelEn: "Estimate (toman)",
        placeholderFa: "برآورد به تومان",
        placeholderEn: "Estimate",
        kind: "numeric",
      },
      {
        id: "photo",
        storeAs: "photo",
        labelFa: "عکس خودرو / خرابی",
        labelEn: "Photo",
        placeholderFa: "",
        placeholderEn: "",
        kind: "file",
      },
      {
        id: "note",
        storeAs: "note",
        labelFa: "یادداشت",
        labelEn: "Note",
        placeholderFa: "یادداشت",
        placeholderEn: "Note",
        kind: "textarea",
      },
    ],
  },
  electrician: {
    id: "electrician",
    categoryId: "trades",
    nameFa: "برق‌کار",
    nameEn: "Electrician",
    appTitleFa: "تقویم نوبت برق‌کاری",
    appTitleEn: "Electrician calendar",
    customerLabelFa: "مشتری",
    customerLabelEn: "Customer",
    traineesLabelFa: "کارآموزها",
    traineesLabelEn: "Trainees",
    cashLabelFa: "صندوق",
    cashLabelEn: "Cash box",
    calendarLabelFa: "تقویم",
    calendarLabelEn: "Calendar",
    addBookingFa: "ثبت نوبت همین روز",
    addBookingEn: "Add appointment for this day",
    emptyDayFa: "این روز خالی است.",
    emptyDayEn: "This day is empty.",
    offlineHintFa: "نوبت‌ها روی گوشی می‌مانند و بدون اینترنت کار می‌کنند.",
    offlineHintEn: "Appointments stay on device and work offline.",
    allowsServerSync: false,
    fields: serviceFields({
      serviceFa: "نوع کار برقی",
      serviceEn: "Electrical job",
      placeFa: "آدرس / محل",
      placeEn: "Address / site",
    }),
  },
  plumber: {
    id: "plumber",
    categoryId: "trades",
    nameFa: "لوله‌کش",
    nameEn: "Plumber",
    appTitleFa: "تقویم نوبت لوله‌کشی",
    appTitleEn: "Plumber calendar",
    customerLabelFa: "مشتری",
    customerLabelEn: "Customer",
    traineesLabelFa: "کارآموزها",
    traineesLabelEn: "Trainees",
    cashLabelFa: "صندوق",
    cashLabelEn: "Cash box",
    calendarLabelFa: "تقویم",
    calendarLabelEn: "Calendar",
    addBookingFa: "ثبت نوبت همین روز",
    addBookingEn: "Add appointment for this day",
    emptyDayFa: "این روز خالی است.",
    emptyDayEn: "This day is empty.",
    offlineHintFa: "نوبت‌ها روی گوشی می‌مانند و بدون اینترنت کار می‌کنند.",
    offlineHintEn: "Appointments stay on device and work offline.",
    allowsServerSync: false,
    fields: serviceFields({
      serviceFa: "نوع کار",
      serviceEn: "Job type",
      placeFa: "آدرس / محل",
      placeEn: "Address / site",
    }),
  },
  hvac: {
    id: "hvac",
    categoryId: "trades",
    nameFa: "تعمیرکار کولر / تهویه",
    nameEn: "HVAC technician",
    appTitleFa: "تقویم نوبت تهویه",
    appTitleEn: "HVAC calendar",
    customerLabelFa: "مشتری",
    customerLabelEn: "Customer",
    traineesLabelFa: "کارآموزها",
    traineesLabelEn: "Trainees",
    cashLabelFa: "صندوق",
    cashLabelEn: "Cash box",
    calendarLabelFa: "تقویم",
    calendarLabelEn: "Calendar",
    addBookingFa: "ثبت نوبت همین روز",
    addBookingEn: "Add appointment for this day",
    emptyDayFa: "این روز خالی است.",
    emptyDayEn: "This day is empty.",
    offlineHintFa: "نوبت‌ها روی گوشی می‌مانند و بدون اینترنت کار می‌کنند.",
    offlineHintEn: "Appointments stay on device and work offline.",
    allowsServerSync: false,
    fields: serviceFields({
      serviceFa: "نوع دستگاه / خدمت",
      serviceEn: "Device / service",
      placeFa: "آدرس / محل",
      placeEn: "Address / site",
    }),
  },
  lawyer: {
    id: "lawyer",
    categoryId: "legal",
    nameFa: "وکیل",
    nameEn: "Lawyer",
    appTitleFa: "تقویم جلسه حقوقی",
    appTitleEn: "Legal calendar",
    customerLabelFa: "موکل",
    customerLabelEn: "Client",
    traineesLabelFa: "کارآموزان",
    traineesLabelEn: "Trainees",
    cashLabelFa: "صندوق",
    cashLabelEn: "Cash box",
    calendarLabelFa: "تقویم",
    calendarLabelEn: "Calendar",
    addBookingFa: "ثبت جلسه همین روز",
    addBookingEn: "Add meeting for this day",
    emptyDayFa: "این روز خالی است.",
    emptyDayEn: "This day is empty.",
    offlineHintFa: "جلسه‌ها روی گوشی می‌مانند و بدون اینترنت کار می‌کنند.",
    offlineHintEn: "Meetings stay on device and work offline.",
    allowsServerSync: false,
    fields: serviceFields({
      serviceFa: "موضوع پرونده",
      serviceEn: "Case topic",
      placeFa: "نوع جلسه",
      placeEn: "Meeting type",
    }),
  },
  photographer: {
    id: "photographer",
    categoryId: "creative",
    nameFa: "عکاس",
    nameEn: "Photographer",
    appTitleFa: "تقویم جلسه عکاسی",
    appTitleEn: "Photo calendar",
    customerLabelFa: "مشتری",
    customerLabelEn: "Client",
    traineesLabelFa: "کارآموزها",
    traineesLabelEn: "Trainees",
    cashLabelFa: "صندوق",
    cashLabelEn: "Cash box",
    calendarLabelFa: "تقویم",
    calendarLabelEn: "Calendar",
    addBookingFa: "ثبت جلسه همین روز",
    addBookingEn: "Add shoot for this day",
    emptyDayFa: "این روز خالی است.",
    emptyDayEn: "This day is empty.",
    offlineHintFa: "جلسه‌ها روی گوشی می‌مانند و بدون اینترنت کار می‌کنند.",
    offlineHintEn: "Sessions stay on device and work offline.",
    allowsServerSync: false,
    fields: serviceFields({
      serviceFa: "نوع عکاسی",
      serviceEn: "Shoot type",
      placeFa: "لوکیشن",
      placeEn: "Location",
      photoFa: "مرجع تصویری",
      photoEn: "Reference photo",
    }),
  },
  tailor: {
    id: "tailor",
    categoryId: "creative",
    nameFa: "خیاط",
    nameEn: "Tailor",
    appTitleFa: "تقویم نوبت خیاطی",
    appTitleEn: "Tailor calendar",
    customerLabelFa: "مشتری",
    customerLabelEn: "Client",
    traineesLabelFa: "کارآموزها",
    traineesLabelEn: "Trainees",
    cashLabelFa: "صندوق",
    cashLabelEn: "Cash box",
    calendarLabelFa: "تقویم",
    calendarLabelEn: "Calendar",
    addBookingFa: "ثبت نوبت همین روز",
    addBookingEn: "Add appointment for this day",
    emptyDayFa: "این روز خالی است.",
    emptyDayEn: "This day is empty.",
    offlineHintFa: "نوبت‌ها روی گوشی می‌مانند و بدون اینترنت کار می‌کنند.",
    offlineHintEn: "Appointments stay on device and work offline.",
    allowsServerSync: false,
    fields: serviceFields({
      serviceFa: "نوع دوخت / اصلاح",
      serviceEn: "Job type",
      placeFa: "اندازه / توضیح",
      placeEn: "Measurements / notes",
    }),
  },
  other_service: {
    id: "other_service",
    categoryId: "other",
    nameFa: "سایر خدمات نوبتی",
    nameEn: "Other appointment service",
    appTitleFa: "تقویم نوبت",
    appTitleEn: "Appointment calendar",
    customerLabelFa: "مراجع",
    customerLabelEn: "Client",
    traineesLabelFa: "کارآموزها",
    traineesLabelEn: "Trainees",
    cashLabelFa: "صندوق",
    cashLabelEn: "Cash box",
    calendarLabelFa: "تقویم",
    calendarLabelEn: "Calendar",
    addBookingFa: "ثبت نوبت همین روز",
    addBookingEn: "Add appointment for this day",
    emptyDayFa: "این روز خالی است.",
    emptyDayEn: "This day is empty.",
    offlineHintFa: "نوبت‌ها روی گوشی می‌مانند و بدون اینترنت کار می‌کنند.",
    offlineHintEn: "Appointments stay on device and work offline.",
    allowsServerSync: false,
    fields: serviceFields({
      serviceFa: "نوع خدمت",
      serviceEn: "Service",
      placeFa: "جزئیات",
      placeEn: "Details",
    }),
  },
};

/** New picker uses the full source catalogue. Legacy identifiers and labels still resolve. */
export const PROFESSION_PACKS: Record<ProfessionId, ProfessionPack> = { ...LEGACY_PACKS };
export const PROFESSION_CATEGORIES: ProfessionCategory[] = SERVICE_CATALOG.map((category) => ({
  id: category.id,
  nameFa: category.nameFa,
  nameEn: category.nameEn,
  professionIds: category.professions.map((job) => job.id),
}));
function detailField(id: string, label: string): BookingField {
  return {
    id,
    storeAs: "details",
    kind: "text",
    labelFa: label,
    labelEn: label,
    placeholderFa: label,
    placeholderEn: label,
  };
}
for (const category of SERVICE_CATALOG) {
  for (const job of category.professions) {
    const legacy = LEGACY_PACKS[job.id];
    const base = legacy || LEGACY_PACKS.other_service;
    let extras: string[];
    const name = job.nameFa;
    if (/خودرو|روغنی|لاستیک/.test(name))
      extras = ["برند و مدل خودرو", "شماره پلاک", "کیلومتر کارکرد", "نوع سرویس / قطعه"];
    else if (/موبایل|کامپیوتر|لپ‌تاپ|خانگی|یخچال|پکیج|کولر|آسانسور|دوربین|دزدگیر/.test(name))
      extras = ["نوع دستگاه", "برند و مدل", "شماره سریال", "شرح خرابی / نصب", "آدرس محل خدمت"];
    else if (category.id === "technical" || category.id === "building")
      extras = ["نوع عملیات", "آدرس پروژه", "متراژ / تعداد", "جنس و ابعاد", "مدت اجرا"];
    else if (/سالمندان|پرستاری|کودک/.test(name))
      extras = ["نوع مراقبت", "سن مراجع", "شیفت / مدت مراقبت", "آدرس", "نیازهای مراقبتی"];
    else if (category.id === "beauty")
      extras = ["نوع خدمت", "مواد / رنگ / برند", "مدت خدمت", "حساسیت‌ها / توضیحات"];
    else if (category.id === "home")
      extras = ["نوع خدمت", "آدرس", "متراژ / تعداد اقلام", "جنس / شرایط", "مدت خدمت"];
    else if (category.id === "transport")
      extras = ["مبدأ", "مقصد", "نوع خودرو", "نوع بار / تعداد مسافر", "زمان رسیدن"];
    else if (category.id === "education")
      extras = ["درس / نوع کلاس", "سطح هنرجو", "شماره جلسه", "مدت جلسه", "حضوری / آنلاین و محل"];
    else if (category.id === "office")
      extras = [
        "نوع پرونده / خدمت",
        "موضوع / زبان سند",
        "تعداد صفحات / اسناد",
        "شماره پیگیری",
        "مهلت تحویل",
      ];
    else if (category.id === "digital")
      extras = [
        "نام پروژه / برند",
        "نوع خروجی / پلتفرم",
        "ابعاد / حجم کار",
        "مهلت تحویل",
        "نشانی سایت / لوکیشن",
      ];
    else if (category.id === "sales")
      extras = ["محصول / خدمت", "تعداد / مقدار", "مرحله پیگیری", "آدرس مشتری", "زمان پیگیری بعدی"];
    else
      extras = [
        "نوع رزرو / خدمت",
        "تعداد نفرات",
        "تاریخ پایان / خروج",
        "محل / مقصد",
        "شماره اتاق / میز / رزرو",
      ];
    PROFESSION_PACKS[job.id] = {
      ...base,
      id: job.id,
      categoryId: category.id,
      // Tattoo terminology is deliberately unchanged for existing users.
      nameFa: job.id === "tattoo_artist" ? base.nameFa : name,
      nameEn: legacy?.nameEn || name,
      appTitleFa: legacy?.appTitleFa || `تقویم نوبت ${name}`,
      fields:
        job.id === "tattoo_artist"
          ? base.fields
          : [
              ...(legacy?.fields ||
                serviceFields({
                  serviceFa: `نوع خدمت ${name}`,
                  serviceEn: "Service",
                  placeFa: "محل / جزئیات",
                  placeEn: "Location / details",
                })),
              ...extras.map((label, i) => detailField(`job-${i + 1}`, label)),
            ],
      allowsServerSync: job.id === "tattoo_artist",
    };
  }
}
// Used for search without changing preserved tattoo labels.
export function professionSearchText(id: string) {
  const source = SERVICE_CATALOG.flatMap<{ id: string; nameFa: string }>((c) => [
    ...c.professions,
  ]).find((j) => j.id === id);
  const pack = getProfessionPack(id);
  return `${source?.nameFa || ""} ${pack.nameFa} ${pack.nameEn} ${id === "tattoo_artist" ? "تاتو تتو" : ""}`;
}
export function normalizeProfessionSearch(value: string) {
  return value
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\s\u200c-]+/g, "");
}

export function getProfessionPack(id: ProfessionId | null | undefined): ProfessionPack {
  if (id && PROFESSION_PACKS[id]) return PROFESSION_PACKS[id];
  return PROFESSION_PACKS.tattoo_artist;
}

export function labelFor(pack: ProfessionPack, key: keyof ProfessionPack, locale: PocketLocale) {
  if (locale === "en") {
    const enKey = `${key}` as keyof ProfessionPack;
    const maybe = pack[enKey];
    if (typeof maybe === "string" && key.endsWith("En")) return maybe;
  }
  const faKey = key;
  const value = pack[faKey];
  return typeof value === "string" ? value : "";
}

export function fieldLabel(field: BookingField, locale: PocketLocale) {
  return locale === "en" ? field.labelEn : field.labelFa;
}

export function fieldPlaceholder(field: BookingField, locale: PocketLocale) {
  return locale === "en" ? field.placeholderEn : field.placeholderFa;
}

export function packTitle(pack: ProfessionPack, locale: PocketLocale) {
  return locale === "en" ? pack.appTitleEn : pack.appTitleFa;
}

export function packText(
  pack: ProfessionPack,
  locale: PocketLocale,
  fa: keyof ProfessionPack,
  en: keyof ProfessionPack,
) {
  const value = locale === "en" ? pack[en] : pack[fa];
  return typeof value === "string" ? value : "";
}

/** Client + server helper: only tattoo pack may request server download. */
export function canRequestServerSync(professionId: ProfessionId | null | undefined) {
  return getProfessionPack(professionId).allowsServerSync === true;
}
