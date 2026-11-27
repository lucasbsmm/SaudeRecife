/** Dados que precisam sobreviver à troca de telas durante um agendamento. */
export const estado = {
  triagem: null, // { entrada, resultado }
  agendamento: {}, // { especialidade, clinica, profissional, data, hora }
};

export function reiniciarAgendamento() {
  estado.agendamento = {};
}
