export function getGenreSelectorState({ genresLoading, genresError, genres }) {
  if (genresLoading) {
    return { kind: "loading", message: "Cargando generos..." };
  }

  if (genresError) {
    return { kind: "error", message: genresError };
  }

  if (!genres.length) {
    return { kind: "empty", message: "Todavia no hay generos cargados en la base. Cuando existan, vas a poder seleccionarlos aca." };
  }

  return { kind: "ready", message: "" };
}

