const entidades = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapar(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => entidades[c]);
}

class HtmlSeguro {
  constructor(texto) {
    this.texto = texto;
  }
  toString() {
    return this.texto;
  }
}

function converter(valor) {
  if (valor instanceof HtmlSeguro) return valor.texto;
  if (Array.isArray(valor)) return valor.map(converter).join('');
  if (valor === null || valor === undefined || valor === false) return '';
  return escapar(valor);
}

/** Template literal que escapa tudo o que for interpolado, exceto outros trechos `html`. */
export function html(textos, ...valores) {
  let saida = textos[0];
  valores.forEach((valor, i) => {
    saida += converter(valor) + textos[i + 1];
  });
  return new HtmlSeguro(saida);
}

export function bruto(texto) {
  return new HtmlSeguro(texto);
}

export function desenhar(elemento, conteudo) {
  elemento.innerHTML = String(conteudo);
}

// ---------- datas ----------

const FUSO = 'America/Recife';

export function hojeEmRecife() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function horaAtualEmRecife() {
  const partes = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
  return partes;
}

const comoData = (dataIso) => new Date(`${dataIso}T12:00:00Z`);
const formatador = (opcoes) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', ...opcoes });

export const formatarDataLonga = (d) => formatador({ weekday: 'long', day: 'numeric', month: 'long' }).format(comoData(d));
export const formatarDataCompleta = (d) => formatador({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(comoData(d));
export const formatarDataCurta = (d) => formatador({ day: '2-digit', month: '2-digit', year: 'numeric' }).format(comoData(d));
export const diaDoMes = (d) => formatador({ day: 'numeric' }).format(comoData(d));
export const diaSemanaCurto = (d) => formatador({ weekday: 'short' }).format(comoData(d)).replace('.', '');
export const mesCurto = (d) => formatador({ month: 'short' }).format(comoData(d)).replace('.', '');

export function somarDias(dataIso, dias) {
  const data = comoData(dataIso);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

export function calcularIdade(dataNascimento) {
  const [ano, mes, dia] = hojeEmRecife().split('-').map(Number);
  const [anoN, mesN, diaN] = dataNascimento.split('-').map(Number);
  return ano - anoN - (mes < mesN || (mes === mesN && dia < diaN) ? 1 : 0);
}

export const nomesDiasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export function consultaJaPassou(consulta) {
  const hoje = hojeEmRecife();
  return consulta.data < hoje || (consulta.data === hoje && consulta.hora <= horaAtualEmRecife());
}

// ---------- texto ----------

export function formatarCpf(cpf = '') {
  const d = String(cpf).replace(/\D/g, '').slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function formatarTelefone(telefone = '') {
  const d = String(telefone).replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function formatarCep(cep = '') {
  const d = String(cep).replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export const primeiroNome = (nome = '') => nome.trim().split(/\s+/)[0] ?? '';

export function iniciais(nome = '') {
  const partes = nome.replace(/^(Dra?\.)\s+/i, '').trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

export function enderecoCompleto(endereco = {}) {
  const rua = [endereco.logradouro, endereco.numero].filter(Boolean).join(', ');
  return [rua, endereco.bairro, `${endereco.cidade ?? ''}${endereco.uf ? ` - ${endereco.uf}` : ''}`.trim()].filter(Boolean).join(', ');
}

export function linkMapa(clinica) {
  const consulta = encodeURIComponent(`${clinica.nome}, ${enderecoCompleto(clinica.endereco)}`);
  return `https://www.google.com/maps/search/?api=1&query=${consulta}`;
}

export const rotulosStatus = { agendado: 'Agendada', cancelado: 'Cancelada', concluido: 'Concluída' };

export function debounce(funcao, espera = 300) {
  let temporizador;
  return (...argumentos) => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => funcao(...argumentos), espera);
  };
}

// ---------- objetos aninhados ("endereco.bairro") ----------

export function obterCaminho(objeto, caminho) {
  return caminho.split('.').reduce((atual, chave) => (atual == null ? undefined : atual[chave]), objeto);
}

export function definirCaminho(objeto, caminho, valor) {
  const chaves = caminho.split('.');
  const ultima = chaves.pop();
  let atual = objeto;
  for (const chave of chaves) atual = atual[chave] ??= {};
  atual[ultima] = valor;
}
