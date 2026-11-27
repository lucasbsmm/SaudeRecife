import { somenteDigitos } from './texto';

export function cpfValido(valor: string): boolean {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calcularDigito = (base: string, pesoInicial: number): number => {
    const soma = base.split('').reduce((total, n, i) => total + Number(n) * (pesoInicial - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return calcularDigito(cpf.slice(0, 9), 10) === Number(cpf[9]) && calcularDigito(cpf.slice(0, 10), 11) === Number(cpf[10]);
}
