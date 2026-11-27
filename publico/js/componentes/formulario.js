import { html, bruto, obterCaminho, definirCaminho, formatarCpf, formatarTelefone, formatarCep } from '../utilitarios.js';

const TIPOS_INPUT = { texto: 'text', email: 'email', telefone: 'tel', cpf: 'text', cep: 'text', senha: 'password', data: 'date', hora: 'time', numero: 'number' };
const MASCARAS = { cpf: formatarCpf, telefone: formatarTelefone, cep: formatarCep };

const idDoCampo = (prefixo, nome) => `${prefixo}-${nome.replaceAll('.', '-')}`;

function opcoesSelect(campo, valor) {
  const opcoes = (campo.opcoes ?? []).map(
    (o) => html`<option value="${o.valor}" ${String(o.valor) === String(valor ?? '') ? bruto('selected') : ''}>${o.rotulo}</option>`,
  );
  return html`<option value="">${campo.textoVazio ?? 'Selecione'}</option>${opcoes}`;
}

function controle(campo, valor, id, descritoPor) {
  const comum = html`id="${id}" name="${campo.nome}" aria-describedby="${descritoPor}" ${campo.obrigatorio ? bruto('required') : ''}`;

  switch (campo.tipo) {
    case 'area':
      return html`<textarea ${comum} rows="3" maxlength="${campo.maximo ?? 500}">${valor ?? ''}</textarea>`;
    case 'selecao':
      return html`<select ${comum}>${opcoesSelect(campo, valor)}</select>`;
    default: {
      const tipo = TIPOS_INPUT[campo.tipo] ?? 'text';
      const inputmode = campo.tipo === 'cpf' || campo.tipo === 'cep' ? 'numeric' : '';
      const mascara = MASCARAS[campo.tipo] ? campo.tipo : '';
      const valorExibido = MASCARAS[campo.tipo] ? MASCARAS[campo.tipo](valor) : valor;
      return html`<input ${comum} type="${tipo}" value="${valorExibido ?? ''}"
        ${inputmode ? html`inputmode="${inputmode}"` : ''} ${mascara ? html`data-mascara="${mascara}"` : ''}
        ${campo.autocomplete ? html`autocomplete="${campo.autocomplete}"` : ''}
        ${campo.minimo !== undefined ? html`min="${campo.minimo}"` : ''} ${campo.maximo !== undefined ? html`max="${campo.maximo}"` : ''}
        ${campo.passo ? html`step="${campo.passo}"` : ''} ${campo.tipo === 'senha' ? html`minlength="8"` : ''}>`;
    }
  }
}

function htmlCampo(campo, valor, prefixo) {
  const id = idDoCampo(prefixo, campo.nome);
  const descritoPor = `${id}-ajuda ${id}-erro`;

  if (campo.tipo === 'caixa') {
    return html`
      <div class="campo campo--caixa" data-campo="${campo.nome}">
        <label class="caixa"><input type="checkbox" id="${id}" name="${campo.nome}" ${valor ? bruto('checked') : ''}><span>${campo.rotulo}</span></label>
        <p class="campo__erro" id="${id}-erro" role="alert"></p>
      </div>`;
  }

  if (campo.tipo === 'multipla') {
    const marcados = new Set((valor ?? []).map(String));
    return html`
      <fieldset class="campo campo--grupo" data-campo="${campo.nome}">
        <legend>${campo.rotulo}</legend>
        ${(campo.opcoes ?? []).length === 0 ? html`<p class="campo__ajuda">Nenhuma opção cadastrada.</p>` : ''}
        ${(campo.opcoes ?? []).map(
          (o) => html`<label class="caixa"><input type="checkbox" name="${campo.nome}" value="${o.valor}" ${marcados.has(String(o.valor)) ? bruto('checked') : ''}><span>${o.rotulo}</span></label>`,
        )}
        <p class="campo__erro" id="${id}-erro" role="alert"></p>
      </fieldset>`;
  }

  return html`
    <div class="campo" data-campo="${campo.nome}">
      <label for="${id}">${campo.rotulo}${campo.obrigatorio ? '' : html` <span class="campo__opcional">(opcional)</span>`}</label>
      ${controle(campo, valor, id, descritoPor)}
      ${campo.ajuda ? html`<p class="campo__ajuda" id="${id}-ajuda">${campo.ajuda}</p>` : ''}
      <p class="campo__erro" id="${id}-erro" role="alert"></p>
    </div>`;
}

export function htmlCampos(campos, valores = {}, prefixo = 'campo') {
  return campos.map((campo) => htmlCampo(campo, obterCaminho(valores, campo.nome), prefixo));
}

/** Lê os campos do formulário e devolve um objeto (com aninhamento para nomes como "endereco.bairro"). */
export function lerValores(formulario, campos) {
  const resultado = {};
  for (const campo of campos) {
    const elementos = formulario.querySelectorAll(`[name="${CSS.escape(campo.nome)}"]`);
    if (!elementos.length) continue;

    let valor;
    if (campo.tipo === 'caixa') valor = elementos[0].checked;
    else if (campo.tipo === 'multipla') valor = [...elementos].filter((e) => e.checked).map((e) => e.value);
    else {
      valor = elementos[0].value.trim();
      if (campo.tipo === 'senha') valor = elementos[0].value;
      if (valor !== '' && (campo.tipo === 'numero' || campo.converter === 'numero')) valor = Number(valor);
    }
    definirCaminho(resultado, campo.nome, valor);
  }
  return resultado;
}

export function limparErros(formulario) {
  formulario.querySelectorAll('[aria-invalid]').forEach((e) => e.removeAttribute('aria-invalid'));
  formulario.querySelectorAll('.campo__erro').forEach((e) => (e.textContent = ''));
  const geral = formulario.querySelector('.formulario__erro');
  if (geral) {
    geral.hidden = true;
    geral.textContent = '';
  }
}

/** Mostra os erros devolvidos pela API junto aos campos; o que não casar vai para o aviso geral. */
export function mostrarErros(formulario, erro) {
  let sobrou = erro.detalhes.length === 0;

  for (const { campo, mensagem } of erro.detalhes) {
    const alvo = formulario.querySelector(`[data-campo="${CSS.escape(campo)}"]`);
    if (!alvo) {
      sobrou = true;
      continue;
    }
    alvo.querySelector('.campo__erro').textContent = mensagem;
    alvo.querySelector('input, select, textarea')?.setAttribute('aria-invalid', 'true');
  }

  const geral = formulario.querySelector('.formulario__erro');
  if (geral && sobrou) {
    geral.textContent = erro.message;
    geral.hidden = false;
  }

  formulario.querySelector('[aria-invalid="true"]')?.focus();
  if (sobrou) geral?.scrollIntoView({ block: 'nearest' });
}

export function ativarMascaras(formulario) {
  formulario.addEventListener('input', (evento) => {
    const mascara = MASCARAS[evento.target.dataset?.mascara];
    if (mascara) evento.target.value = mascara(evento.target.value);
  });
}

/** Campos com `dependeDe` recarregam suas opções quando o campo "pai" muda. */
export function ativarDependencias(formulario, campos) {
  for (const filho of campos.filter((c) => c.dependeDe && c.carregarOpcoes)) {
    const pai = formulario.querySelector(`[name="${CSS.escape(filho.dependeDe)}"]`);
    const select = formulario.querySelector(`select[name="${CSS.escape(filho.nome)}"]`);
    if (!pai || !select) continue;

    pai.addEventListener('change', async () => {
      const anterior = select.value;
      const opcoes = await filho.carregarOpcoes(lerValores(formulario, campos));
      select.innerHTML = String(opcoesSelect({ ...filho, opcoes }, anterior));
    });
  }
}

