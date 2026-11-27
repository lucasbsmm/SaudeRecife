import { hash } from 'bcryptjs';
import { z } from 'zod';
import { Paciente } from '../modelos/Paciente';
import { Usuario } from '../modelos/Usuario';
import { cpfValido } from '../utilitarios/cpf';
import { agoraEmRecife, dataValida } from '../utilitarios/datas';
import { ErroHttp } from '../utilitarios/erros';
import { somenteDigitos } from '../utilitarios/texto';
import { opcional } from '../utilitarios/validacao';

export const campoNome = z.string().trim().min(3).max(120);
export const campoEmail = z.string().trim().toLowerCase().email();
export const campoCpf = z.string().refine(cpfValido, 'CPF inválido.').transform(somenteDigitos);
export const campoSenha = z
  .string()
  .min(8, 'A senha precisa ter ao menos 8 caracteres.')
  .max(72)
  .regex(/[A-Za-z]/, 'A senha precisa ter ao menos uma letra.')
  .regex(/\d/, 'A senha precisa ter ao menos um número.');

export const campoTelefone = z
  .string()
  .transform(somenteDigitos)
  .refine((v) => v.length === 10 || v.length === 11, 'Informe o telefone com DDD.');

export const campoDataNascimento = z
  .string()
  .refine(dataValida, 'Data inválida.')
  .refine((data) => data <= agoraEmRecife().data, 'A data de nascimento não pode ser futura.')
  .refine((data) => data >= '1900-01-01', 'Data inválida.');

export const esquemaNovoPaciente = z.object({
  nome: campoNome,
  cpf: campoCpf,
  email: campoEmail,
  senha: campoSenha,
  telefone: opcional(campoTelefone),
  dataNascimento: campoDataNascimento,
  bairro: opcional(z.string().trim().max(80)),
});
export type DadosNovoPaciente = z.infer<typeof esquemaNovoPaciente>;

export async function garantirContaLivre(email: string, cpf?: string, ignorarUsuarioId?: string): Promise<void> {
  const condicoes: Record<string, string>[] = [{ email }];
  if (cpf) condicoes.push({ cpf });

  const existente = await Usuario.findOne({ $or: condicoes });
  if (existente && String(existente._id) !== ignorarUsuarioId) {
    throw new ErroHttp(409, existente.email === email ? 'Já existe uma conta com este e-mail.' : 'Já existe uma conta com este CPF.', [
      { campo: existente.email === email ? 'email' : 'cpf', mensagem: 'Valor já cadastrado.' },
    ]);
  }
}

/** Cria o usuário (credenciais) e o paciente (dados cadastrais) como uma operação só. */
export async function criarPaciente(dados: DadosNovoPaciente) {
  await garantirContaLivre(dados.email, dados.cpf);

  const usuario = await Usuario.create({
    nome: dados.nome,
    email: dados.email,
    cpf: dados.cpf,
    senhaHash: await hash(dados.senha, 10),
    perfil: 'paciente',
  });

  try {
    const paciente = await Paciente.create({
      usuario: usuario._id,
      nome: dados.nome,
      cpf: dados.cpf,
      email: dados.email,
      telefone: dados.telefone,
      dataNascimento: dados.dataNascimento,
      bairro: dados.bairro,
    });
    return { usuario, paciente };
  } catch (erro) {
    await Usuario.deleteOne({ _id: usuario._id });
    throw erro;
  }
}
