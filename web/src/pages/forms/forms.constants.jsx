import React from "react";
import {
  TbForms,
  TbFileText,
  TbListNumbers,
  TbCurrencyDollar,
  TbSelector,
  TbCheckbox,
  TbClock,
  TbCalendar,
  TbCalendarTime,
  TbPhoto,
  TbUpload,
  TbWriting,
  TbMapPin,
  TbPhone,
  TbMail,
  TbShoppingCart,
  TbTable,
  TbShieldCheck,
  TbUsers,
  TbNotes,
  TbHash,
  TbAlignLeft,
  TbAddressBook,
  TbCircleCheck,
  TbClipboardText,
  TbTruck,
  TbPackage,
} from "react-icons/tb";

export const FIELD_LIBRARY = [
  { type: "text", label: "Texto", icon: <TbForms /> },
  { type: "number", label: "Número", icon: <TbHash /> },
  { type: "currency", label: "Moneda", icon: <TbCurrencyDollar /> },
  { type: "textarea", label: "Párrafo", icon: <TbAlignLeft /> },
  { type: "select", label: "Selección", icon: <TbSelector /> },
  { type: "multiselect", label: "Selección múltiple", icon: <TbCheckbox /> },
  { type: "traffic_light", label: "Validación semáforo", icon: <TbCircleCheck /> },
  { type: "phone", label: "Teléfono", icon: <TbPhone /> },
  { type: "email", label: "Correo", icon: <TbMail /> },
  { type: "address", label: "Dirección", icon: <TbMapPin /> },
  { type: "date", label: "Fecha", icon: <TbCalendar /> },
  { type: "time", label: "Hora", icon: <TbClock /> },
  { type: "datetime", label: "Fecha y hora", icon: <TbCalendarTime /> },
  { type: "file", label: "Archivo", icon: <TbUpload /> },
  { type: "image", label: "Fotos", icon: <TbPhoto /> },
  { type: "signature", label: "Firma", icon: <TbWriting /> },
  { type: "table_purchase", label: "Tabla compra/entrada", icon: <TbTable /> },
  { type: "product_list", label: "Lista de productos", icon: <TbListNumbers /> },
  { type: "cart", label: "Carrito de compra", icon: <TbShoppingCart /> },
  { type: "agenda", label: "Agenda", icon: <TbAddressBook /> },
];
export const ICON_OPTIONS = [
  { value: "clipboard", label: "Portapapeles", Icon: TbClipboardText },
  { value: "file", label: "Archivo", Icon: TbFileText },
  { value: "shield", label: "Seguridad", Icon: TbShieldCheck },
  { value: "truck", label: "Logística", Icon: TbTruck },
  { value: "users", label: "Personal", Icon: TbUsers },
  { value: "calendar", label: "Calendario", Icon: TbCalendar },
  { value: "check", label: "Validación", Icon: TbCircleCheck },
  { value: "camera", label: "Evidencia", Icon: TbPhoto },
  { value: "package", label: "Inventario", Icon: TbPackage },
  { value: "notes", label: "Notas", Icon: TbNotes },
];

export const FIELD_TYPE_OPTIONS = FIELD_LIBRARY.map((field) => ({
  value: field.type,
  label: field.label,
}));

export const VISIBILITY_OPTIONS = [
  { value: "all", label: "Visible para todos" },
  { value: "editor_only", label: "Solo editor / tabla" },
];

export const TRAFFIC_LIGHT_DEFAULT_OPTIONS = [
  { value: "red", label: "Rojo", color: "#ef4444" },
  { value: "orange", label: "Naranja", color: "#f59e0b" },
  { value: "green", label: "Verde", color: "#22c55e" },
];

export function getFormIcon(iconKey) {
  const found = ICON_OPTIONS.find((item) => item.value === iconKey);
  const Icon = found?.Icon || TbFileText;
  return <Icon />;
}

export function getFieldIcon(fieldType) {
  const found = FIELD_LIBRARY.find((item) => item.type === fieldType);
  return found?.icon || <TbForms />;
}