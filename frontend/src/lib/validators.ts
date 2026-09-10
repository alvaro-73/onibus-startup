export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isSenhaForte(value: string): boolean {
  return value.length >= 6;
}

export function camposObrigatorios(...valores: string[]): boolean {
  return valores.every((v) => v && v.trim().length > 0);
}
