const EXTERNAL_CATALOG_PRESENTATIONS = {
  tiendanube: {
    sourceLabel: "Tiendanube",
    actionLabel: "Comprar en Tiendanube",
  },
  google_sheets: {
    sourceLabel: "Google Sheets",
    actionLabel: "Ver opción de compra",
  },
};

export function isExternalCatalogItem(item) {
  return Boolean(EXTERNAL_CATALOG_PRESENTATIONS[item?.source]);
}

export function getExternalCatalogPresentation(item) {
  return EXTERNAL_CATALOG_PRESENTATIONS[item?.source] || {
    sourceLabel: "Catálogo externo",
    actionLabel: "Ver opción de compra",
  };
}
