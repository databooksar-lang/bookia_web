export function getGenreSelectorState({ genresLoading, genresError, genres }) {
  if (genresLoading) {
    return { kind: "loading", message: "Cargando generos..." };
  }

  if (genresError) {
    return { kind: "error", message: genresError };
  }

  if (!genres.length) {
    return { kind: "empty", message: "No hay generos disponibles por ahora." };
  }

  return { kind: "ready", message: "" };
}
