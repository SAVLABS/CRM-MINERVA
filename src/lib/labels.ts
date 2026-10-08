import {
  ActivityPriority,
  ActivityStatus,
  ClientType,
  Currency,
  DiscountType,
  IdentificationType,
  OpportunityStatus,
  QuotationStatus,
} from '@/generated/prisma/enums';

/**
 * Etiquetas en español para los enums de Prisma.
 *
 * Los enums se guardan en inglés porque son la clave de la base y no se tocan
 * aunque cambie el idioma de la interfaz; lo que se muestra al usuario se
 * traduce acá.
 */

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  [ClientType.PERSONA_FISICA]: 'Persona física',
  [ClientType.EMPRESA]: 'Empresa',
};

export const IDENTIFICATION_TYPE_LABELS: Record<IdentificationType, string> = {
  [IdentificationType.CEDULA_FISICA]: 'Cédula física',
  [IdentificationType.CEDULA_JURIDICA]: 'Cédula jurídica',
  [IdentificationType.DIMEX]: 'DIMEX',
  [IdentificationType.NIT]: 'NIT',
  [IdentificationType.PASAPORTE]: 'Pasaporte',
  [IdentificationType.OTRO]: 'Otro',
};

/** Identificaciones que corresponden a una persona natural. */
export const PERSON_IDENTIFICATION_TYPES: IdentificationType[] = [
  IdentificationType.CEDULA_FISICA,
  IdentificationType.PASAPORTE,
  IdentificationType.DIMEX,
];

export const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatus, string> = {
  [OpportunityStatus.OPEN]: 'Abierta',
  [OpportunityStatus.WON]: 'Ganada',
  [OpportunityStatus.LOST]: 'Perdida',
};

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  [ActivityStatus.PENDING]: 'Pendiente',
  [ActivityStatus.COMPLETED]: 'Completada',
  [ActivityStatus.CANCELED]: 'Cancelada',
};

export const ACTIVITY_PRIORITY_LABELS: Record<ActivityPriority, string> = {
  [ActivityPriority.LOW]: 'Baja',
  [ActivityPriority.MEDIUM]: 'Media',
  [ActivityPriority.HIGH]: 'Alta',
  [ActivityPriority.URGENT]: 'Urgente',
};

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  [QuotationStatus.DRAFT]: 'Borrador',
  [QuotationStatus.SENT]: 'Enviada',
  [QuotationStatus.ACCEPTED]: 'Aceptada',
  [QuotationStatus.REJECTED]: 'Rechazada',
  [QuotationStatus.EXPIRED]: 'Vencida',
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  [Currency.CRC]: 'Colones (CRC)',
  [Currency.USD]: 'Dólares (USD)',
};

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  [DiscountType.NONE]: 'Sin descuento',
  [DiscountType.PERCENTAGE]: 'Porcentaje',
  [DiscountType.FIXED]: 'Monto fijo',
};

/** RF-037: el schema distingue producto y servicio con el booleano `isService`. */
export const PRODUCT_TYPE_LABELS = {
  producto: 'Producto',
  servicio: 'Servicio',
} as const;

/**
 * RF-042: unidades sugeridas. El campo no las restringe; son solo ayuda para no
 * escribir "unidad", "Unidad", "UNID" y "unidades" como si fueran lo mismo.
 */
export const PRODUCT_UNIT_SUGGESTIONS = [
  'UNIDAD',
  'SERVICIO',
  'HORA',
  'DÍA',
  'MES',
  'KG',
  'GRAMO',
  'LITRO',
  'METRO',
  'CAJA',
  'PAQUETE',
  'SACO',
];

/** Convierte un enum de Prisma en opciones para `<SelectField>`. */
export function toOptions<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}