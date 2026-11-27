export class ErroHttp extends Error {
  constructor(
    public readonly status: number,
    mensagem: string,
    public readonly detalhes?: unknown,
  ) {
    super(mensagem);
    this.name = 'ErroHttp';
  }
}

export const naoEncontrado = (recurso = 'Registro', feminino = false) =>
  new ErroHttp(404, `${recurso} não encontrad${feminino ? 'a' : 'o'}.`);
export const acessoNegado = () => new ErroHttp(403, 'Você não tem permissão para realizar esta ação.');
