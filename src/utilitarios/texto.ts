/** Remove acentos e converte para minúsculas, para buscas tolerantes. */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}
