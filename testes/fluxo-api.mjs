// Teste de integração da API: percorre login, agendamento, cancelamento e as regras por perfil.
// Use em um banco recém-semeado (npm run semear -- --reiniciar) com o servidor rodando:
//   URL_BASE=http://localhost:3000 node testes/fluxo-api.mjs
const B = (process.env.URL_BASE ?? 'http://localhost:3000') + '/api';
let falhas = 0;
const chamar = async (m, c, corpo, token) => {
  const r = await fetch(B + c, { method: m, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
  let d = null; try { d = await r.json(); } catch {}
  return { s: r.status, d };
};
const ok = (nome, cond, extra = '') => { if (!cond) falhas++; console.log(cond ? 'OK  ' : 'FALHA', nome, cond ? '' : extra); };

const adm = (await chamar('POST', '/autenticacao/entrar', { identificador: 'admin@saude-recife.test', senha: 'Recife@123' })).d;
const joao = (await chamar('POST', '/autenticacao/entrar', { identificador: '529.982.247-25', senha: 'Recife@123' })).d;
const luana = (await chamar('POST', '/autenticacao/entrar', { identificador: 'luana.martins@saude-recife.test', senha: 'Recife@123' })).d;
ok('login admin / paciente por CPF / profissional', adm?.token && joao?.token && luana?.token);
ok('vínculo do profissional vem populado', luana.usuario.vinculo?.especialidade?.nome === 'Clínica Geral' && luana.usuario.vinculo.clinicas.length === 2, JSON.stringify(luana.usuario.vinculo));
ok('senha errada = 401', (await chamar('POST', '/autenticacao/entrar', { identificador: 'joao@saude-recife.test', senha: 'x' })).s === 401);
ok('sem token = 401', (await chamar('GET', '/clinicas')).s === 401);

const esp = (await chamar('GET', '/especialidades?disponiveis=true', null, joao.token)).d;
ok('especialidades com profissionais (Dermatologia ainda não tem)', esp.itens.length === 7, esp.total);
const geral = esp.itens.find(e => e.nome === 'Clínica Geral');
const cl = (await chamar('GET', `/clinicas?especialidade=${geral.id}`, null, joao.token)).d;
ok('clínicas da especialidade (3)', cl.itens.length === 3, cl.itens.map(c => c.nome));
ok('busca sem acento: "casa forte"', (await chamar('GET', '/clinicas?busca=CASA%20FORTE', null, joao.token)).d.total === 1);
const pr = (await chamar('GET', `/profissionais?clinica=${cl.itens[0].id}&especialidade=${geral.id}`, null, joao.token)).d;
ok('profissionais por clínica+especialidade', pr.itens.length >= 1 && pr.itens[0].especialidade.nome === 'Clínica Geral', JSON.stringify(pr).slice(0, 200));
ok('busca profissional por nome sem acento', (await chamar('GET', '/profissionais?nome=veronica', null, joao.token)).d.total === 1);

const tri = (await chamar('POST', '/triagem', { sintomas: ['febre', 'tosse', 'dor-no-corpo'], intensidade: 'moderada', diasDeSintomas: 2, temperatura: 39.2 }, joao.token)).d;
ok('triagem prioritária + recomendações', tri.classificacao === 'prioritario' && tri.especialidades[0].nome === 'Clínica Geral' && tri.resumo.paciente.nome === 'João da Silva', JSON.stringify(tri).slice(0, 300));

const luanaId = luana.usuario.vinculo.id;
const clinicaSH = luana.usuario.vinculo.clinicas.find(c => c.nome === 'Clínica Santa Helena').id;
const ag = (await chamar('GET', `/profissionais/${luanaId}/agenda?clinica=${clinicaSH}&dias=14`, null, joao.token)).d;
const dia = ag.itens.find(d => d.horarios.some(h => h.disponivel));
const livres = dia.horarios.filter(h => h.disponivel);
ok('agenda com horários livres', livres.length > 0, JSON.stringify(ag).slice(0, 200));
const horario = livres[livres.length - 1];

const corpo = { profissional: luanaId, clinica: clinicaSH, data: dia.data, hora: horario.hora, observacoes: 'Teste', triagem: { sintomas: ['febre'], intensidade: 'leve', diasDeSintomas: 1 } };
const c1 = await chamar('POST', '/agendamentos', corpo, joao.token);
ok('cria agendamento', c1.s === 201 && c1.d.status === 'agendado' && c1.d.triagem.classificacao, JSON.stringify(c1.d).slice(0, 300));
const c2 = await chamar('POST', '/agendamentos', corpo, joao.token);
ok('mesmo horário = 409', c2.s === 409, c2.s + ' ' + JSON.stringify(c2.d));
const ag2 = (await chamar('GET', `/profissionais/${luanaId}/agenda?clinica=${clinicaSH}&dias=14`, null, joao.token)).d;
ok('horário reservado aparece indisponível', ag2.itens.find(d => d.data === dia.data).horarios.find(h => h.hora === horario.hora).disponivel === false);
ok('horário fora da agenda = 409', (await chamar('POST', '/agendamentos', { ...corpo, hora: '03:00' }, joao.token)).s === 409);
ok('profissional não agenda consulta = 403', (await chamar('POST', '/agendamentos', corpo, luana.token)).s === 403);

const prox = (await chamar('GET', '/agendamentos?periodo=proximas', null, joao.token)).d;
const hist = (await chamar('GET', '/agendamentos?periodo=historico', null, joao.token)).d;
ok('próximas (2: seed + nova) / histórico (1)', prox.total === 2 && hist.total === 1, `${prox.total}/${hist.total}`);
const maria = (await chamar('POST', '/autenticacao/entrar', { identificador: 'maria@saude-recife.test', senha: 'Recife@123' })).d;
ok('maria não acessa consulta do joão = 403', (await chamar('GET', `/agendamentos/${c1.d.id}`, null, maria.token)).s === 403);
ok('maria lista 0 consultas', (await chamar('GET', '/agendamentos', null, maria.token)).d.total === 0);

const agProf = (await chamar('GET', `/agendamentos?data=${dia.data}`, null, luana.token)).d;
ok('profissional vê a consulta do dia', agProf.itens.some(a => a.id === c1.d.id && a.paciente.nome === 'João da Silva'));
const canc = await chamar('PATCH', `/agendamentos/${c1.d.id}/cancelar`, { motivo: 'Imprevisto' }, joao.token);
ok('paciente cancela', canc.s === 200 && canc.d.status === 'cancelado' && canc.d.canceladoPor === 'paciente', JSON.stringify(canc.d).slice(0, 200));
ok('cancelar de novo = 409', (await chamar('PATCH', `/agendamentos/${c1.d.id}/cancelar`, {}, joao.token)).s === 409);
const c3 = await chamar('POST', '/agendamentos', corpo, joao.token);
ok('horário liberado após cancelamento', c3.s === 201, c3.s + JSON.stringify(c3.d));
ok('paciente não conclui = 403', (await chamar('PATCH', `/agendamentos/${c3.d.id}/concluir`, {}, joao.token)).s === 403);
ok('profissional conclui', (await chamar('PATCH', `/agendamentos/${c3.d.id}/concluir`, {}, luana.token)).d.status === 'concluido');

// autorização administrativa
ok('paciente não cria clínica = 403', (await chamar('POST', '/clinicas', {}, joao.token)).s === 403);
ok('paciente não lista pacientes = 403', (await chamar('GET', '/pacientes', null, joao.token)).s === 403);
const novaEsp = await chamar('POST', '/especialidades', { nome: 'Endocrinologia', descricao: 'Hormônios' }, adm.token);
ok('admin cria especialidade', novaEsp.s === 201);
ok('especialidade duplicada = 409', (await chamar('POST', '/especialidades', { nome: 'Endocrinologia' }, adm.token)).s === 409);
ok('admin exclui especialidade', (await chamar('DELETE', `/especialidades/${novaEsp.d.id}`, null, adm.token)).s === 204);
const nc = await chamar('POST', '/clinicas', { nome: 'Clínica Teste', telefone: '(81) 3000-0000', endereco: { logradouro: 'Rua A', numero: '10', bairro: 'Graças', cidade: 'Recife', uf: 'pe', cep: '52011-000' } }, adm.token);
ok('admin cria clínica (uf maiúscula)', nc.s === 201 && nc.d.endereco.uf === 'PE', JSON.stringify(nc.d));
const np = await chamar('POST', '/profissionais', { nome: 'Dr. Teste Silva', crm: '99999', especialidade: geral.id, clinicas: [nc.d.id], email: 'teste.silva@saude-recife.test', senha: 'Senha1234', ativo: true }, adm.token);
ok('admin cria profissional com login', np.s === 201 && np.d.clinicas[0].nome === 'Clínica Teste', JSON.stringify(np.d).slice(0, 200));
const loginNovo = await chamar('POST', '/autenticacao/entrar', { identificador: 'teste.silva@saude-recife.test', senha: 'Senha1234' });
ok('novo profissional faz login', loginNovo.s === 200 && loginNovo.d.usuario.perfil === 'profissional');
const disp = await chamar('POST', '/disponibilidades', { clinica: nc.d.id, diaSemana: 2, horaInicio: '08:00', horaFim: '10:00', duracaoMinutos: 30 }, loginNovo.d.token);
ok('profissional cadastra a própria disponibilidade', disp.s === 201, JSON.stringify(disp.d));
ok('conflito de horário = 409', (await chamar('POST', '/disponibilidades', { clinica: nc.d.id, diaSemana: 2, horaInicio: '09:00', horaFim: '11:00', duracaoMinutos: 30 }, loginNovo.d.token)).s === 409);
ok('profissional não mexe na agenda de outro = 403', (await chamar('POST', '/disponibilidades', { profissional: luanaId, clinica: clinicaSH, diaSemana: 2, horaInicio: '08:00', horaFim: '10:00' }, loginNovo.d.token)).s === 403);
ok('clínica não associada = 400', (await chamar('POST', '/disponibilidades', { clinica: clinicaSH, diaSemana: 3, horaInicio: '08:00', horaFim: '10:00' }, loginNovo.d.token)).s === 400);
ok('admin remove associação clínica', (await chamar('DELETE', `/profissionais/${np.d.id}/clinicas/${nc.d.id}`, null, adm.token)).d.clinicas.length === 0);
ok('disponibilidade removida junto', (await chamar('GET', `/disponibilidades?profissional=${np.d.id}`, null, adm.token)).d.total === 0);
ok('excluir clínica com vínculo = 409', (await chamar('DELETE', `/clinicas/${cl.itens[0].id}`, null, adm.token)).s === 409);
ok('admin desativa profissional', (await chamar('DELETE', `/profissionais/${np.d.id}`, null, adm.token)).s === 204);
ok('profissional desativado não loga/usa token', (await chamar('GET', '/autenticacao/eu', null, loginNovo.d.token)).s === 401);

// pacientes
const cad = await chamar('POST', '/autenticacao/cadastrar', { nome: 'Ana Souza', cpf: '123.456.789-09', email: 'ana@exemplo.test', senha: 'senha1234', telefone: '(81) 98888-1111', dataNascimento: '1995-05-20', bairro: '' }, null);
ok('cadastro de paciente', cad.s === 201 && cad.d.usuario.vinculo.cpf === '12345678909', JSON.stringify(cad.d).slice(0, 300));
ok('CPF duplicado = 409', (await chamar('POST', '/autenticacao/cadastrar', { nome: 'Ana Dois', cpf: '12345678909', email: 'outra@exemplo.test', senha: 'senha1234', dataNascimento: '1995-05-20' })).s === 409);
ok('CPF inválido = 400 com detalhe', (await chamar('POST', '/autenticacao/cadastrar', { nome: 'Fulano', cpf: '111.111.111-11', email: 'f@exemplo.test', senha: 'senha1234', dataNascimento: '1990-01-01' })).d.detalhes[0].campo === 'cpf');
const up = await chamar('PUT', `/pacientes/${cad.d.usuario.vinculo.id}`, { nome: 'Ana Souza Lima', email: 'ana@exemplo.test', telefone: '', dataNascimento: '1995-05-20', bairro: 'Boa Vista' }, cad.d.token);
ok('paciente edita próprios dados', up.s === 200 && up.d.nome === 'Ana Souza Lima' && up.d.bairro === 'Boa Vista', JSON.stringify(up.d));
ok('paciente não edita outro = 403', (await chamar('PUT', `/pacientes/${joao.usuario.vinculo.id}`, { nome: 'Hack', email: 'h@x.com', dataNascimento: '1990-01-01' }, cad.d.token)).s === 403);
ok('admin busca paciente por CPF', (await chamar('GET', '/pacientes?busca=12345678909', null, adm.token)).d.total === 1);
ok('troca de senha', (await chamar('PUT', '/autenticacao/senha', { senhaAtual: 'senha1234', novaSenha: 'outraSenha9' }, cad.d.token)).s === 204);
ok('login com nova senha', (await chamar('POST', '/autenticacao/entrar', { identificador: 'ana@exemplo.test', senha: 'outraSenha9' })).s === 200);
ok('resumo admin', (await chamar('GET', '/administracao/resumo', null, adm.token)).d.especialidades === 8);
console.log(falhas ? `\n${falhas} falha(s)` : '\nTodos os testes passaram');
