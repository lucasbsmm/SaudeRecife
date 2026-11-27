import { Types } from 'mongoose';
import { UsuarioAutenticado } from '../middlewares/autenticacao';
import { Paciente } from '../modelos/Paciente';
import { Profissional } from '../modelos/Profissional';

export interface Vinculos {
  pacienteId?: Types.ObjectId;
  profissionalId?: Types.ObjectId;
}

/** Descobre qual paciente ou profissional corresponde ao usuário logado. */
export async function obterVinculos(usuario: UsuarioAutenticado): Promise<Vinculos> {
  if (usuario.perfil === 'paciente') {
    const paciente = await Paciente.findOne({ usuario: usuario.id }).select('_id');
    return { pacienteId: paciente?._id };
  }
  if (usuario.perfil === 'profissional') {
    const profissional = await Profissional.findOne({ usuario: usuario.id }).select('_id');
    return { profissionalId: profissional?._id };
  }
  return {};
}
