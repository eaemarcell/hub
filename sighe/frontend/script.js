const API_URL = '/api';
let usuarioAtual = null;
let listaCompletaUsuariosRH = [];

// --- GERENCIAMENTO DE TEMA (DARK MODE) ---
function alternarTema() {
    const isDark = document.body.classList.toggle('dark');
    document.documentElement.classList.toggle('dark', isDark);
    
    const tema = isDark ? 'dark' : 'light';
    localStorage.setItem('sighe-theme', tema);
    localStorage.setItem('amt_theme', tema);
    localStorage.setItem('amt_hub_theme', tema);
    
    atualizarIconeTema(isDark);
}

function carregarTemaSalvo() {
    const temaSalvo = localStorage.getItem('sighe-theme') || localStorage.getItem('amt_theme') || 'dark';
    const querModoEscuro = temaSalvo === 'dark';
    
    document.body.classList.toggle('dark', querModoEscuro);
    document.documentElement.classList.toggle('dark', querModoEscuro);
    atualizarIconeTema(querModoEscuro);
}

function atualizarIconeTema(isDark) {
    const btnIcon = document.getElementById('icon-theme');
    if (!btnIcon) return;
    
    btnIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    
    if (window.lucide) {
        lucide.createIcons();
    }
}

function formatarDataBR(dataISO) {
    if (!dataISO) return '-';
    const partes = dataISO.split('T')[0].split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : dataISO;
}

function formatarSituacaoCompacta(situacao) {
    if (!situacao) return '-';
    const str = String(situacao).trim();
    if (str.startsWith('1') || str.toLowerCase().includes('sobreaviso')) {
        return `<span class="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 font-bold px-2 py-0.5 rounded text-xs inline-block" title="1 - Sim, estou de sobreaviso">1</span>`;
    }
    if (str.startsWith('2') || str.toLowerCase().includes('acionado')) {
        return `<span class="bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 font-bold px-2 py-0.5 rounded text-xs inline-block" title="2 - Não, porém fui acionado fora do horário comercial">2</span>`;
    }
    return str;
}

function calcularTotalHoras() {
    const inicio = document.getElementById('he-inicio').value;
    const fim = document.getElementById('he-fim').value;
    const campoTotal = document.getElementById('he-total-horas');

    if (!inicio || !fim) {
        campoTotal.value = '';
        return '';
    }

    const [hIni, mIni] = inicio.split(':').map(Number);
    const [hFim, mFim] = fim.split(':').map(Number);

    let minInicio = hIni * 60 + mIni;
    let minFim = hFim * 60 + mFim;

    if (minFim < minInicio) minFim += 24 * 60;

    const diffMin = minFim - minInicio;
    const horas = Math.floor(diffMin / 60);
    const minutos = diffMin % 60;

    const textoTotal = `${String(horas).padStart(2, '0')}h ${String(minutos).padStart(2, '0')}m`;
    campoTotal.value = textoTotal;
    return textoTotal;
}

// --- AUTENTICAÇÃO ---
async function fazerLogin() {
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        if (!res.ok) {
            const err = await res.json();
            alert(err.error || 'E-mail ou senha inválidos.');
            return;
        }

        usuarioAtual = await res.json();

        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('view-dashboard').classList.remove('hidden');
        
        document.getElementById('user-name').innerText = usuarioAtual.nome;
        document.getElementById('user-email').innerText = usuarioAtual.email;
        document.getElementById('user-role-badge').innerText = formatarRoles(usuarioAtual.roles);

        const roles = usuarioAtual.roles || [];
        const temPerfilTecnico = roles.includes('amt') || roles.includes('externo');
        const temPerfilRH = roles.includes('rh');
        const temPerfilAdmin = roles.includes('admin');

        document.getElementById('tab-btn-horas').classList.toggle('hidden', !temPerfilTecnico && !temPerfilAdmin);
        document.getElementById('tab-btn-admin').classList.toggle('hidden', !temPerfilAdmin);
        document.getElementById('tab-btn-rh').classList.toggle('hidden', !temPerfilRH && !temPerfilAdmin);

        carregarRequerentesAMT();

        if (temPerfilRH || temPerfilAdmin) {
            carregarUsuariosNoFiltroRH();
        }

        if (temPerfilRH && !temPerfilTecnico && !temPerfilAdmin) {
            alternarAba('rh');
        } else {
            alternarAba('horas');
        }

        lucide.createIcons();
    } catch (e) {
        alert('Erro ao conectar ao servidor da API.');
    }
}

function fazerLogout() {
    usuarioAtual = null;
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-login').classList.remove('hidden');
    document.getElementById('form-login').reset();
}

function alternarAba(aba) {
    const roles = usuarioAtual?.roles || [];
    if (aba === 'admin' && !roles.includes('admin')) {
        alert('Acesso negado: Perfil sem privilégios de Administrador.');
        return;
    }
    if (aba === 'rh' && !(roles.includes('rh') || roles.includes('admin'))) {
        alert('Acesso negado: Perfil sem acesso ao Recursos Humanos.');
        return;
    }

    const btnHoras = document.getElementById('tab-btn-horas');
    const btnAdmin = document.getElementById('tab-btn-admin');
    const btnRH = document.getElementById('tab-btn-rh');
    
    const contentHoras = document.getElementById('tab-content-horas');
    const contentAdmin = document.getElementById('tab-content-admin');
    const contentRH = document.getElementById('tab-content-rh');

    [btnHoras, btnAdmin, btnRH].forEach(b => b.className = "py-3 px-1 font-medium text-sm border-b-2 border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 flex items-center space-x-2");
    [contentHoras, contentAdmin, contentRH].forEach(c => c.classList.add('hidden'));

    if (aba === 'horas') {
        btnHoras.className = "py-3 px-1 font-medium text-sm border-b-2 border-blue-600 text-blue-600 flex items-center space-x-2";
        contentHoras.classList.remove('hidden');
        carregarMinhasHoras();
    } else if (aba === 'admin') {
        btnAdmin.className = "py-3 px-1 font-medium text-sm border-b-2 border-blue-600 text-blue-600 flex items-center space-x-2";
        contentAdmin.classList.remove('hidden');
        carregarUsuariosAdmin();
        carregarTodasHorasAdmin();
    } else if (aba === 'rh') {
        btnRH.className = "py-3 px-1 font-medium text-sm border-b-2 border-emerald-600 text-emerald-600 flex items-center space-x-2";
        contentRH.classList.remove('hidden');
        carregarHorasRH();
    }
}

function podeEditarRegistro(registro) {
    if (!usuarioAtual) return false;
    const ehAdmin = usuarioAtual.roles && usuarioAtual.roles.includes('admin');
    const ehDonoDoRegistro = Number(registro.usuarioId) === Number(usuarioAtual.id);
    return ehAdmin || ehDonoDoRegistro;
}

// --- POPULAR REQUERENTES (ANALISTA AMT + TÉCNICO AMT) ---
async function carregarRequerentesAMT() {
    const select = document.getElementById('he-requerente');
    if (!select) return;

    select.innerHTML = '<option value="">-- Selecione o Requerente --</option>';

    try {
        const res = await fetch(`${API_URL}/requerentes-amt`);
        const lista = await res.json();
        lista.forEach(req => {
            select.innerHTML += `<option value="${req.nome}">${req.nome}</option>`;
        });
    } catch (e) {
        console.error('Erro ao carregar lista de requerentes AMT:', e);
    }
}

// --- MINHA SENHA ---
function abrirModalMinhaSenha() {
    document.getElementById('modal-minha-senha').classList.remove('hidden');
}

function fecharModalMinhaSenha() {
    document.getElementById('modal-minha-senha').classList.add('hidden');
    document.getElementById('senha-atual').value = '';
    document.getElementById('nova-senha').value = '';
    document.getElementById('confirmar-nova-senha').value = '';
}

async function alterarMinhaSenha() {
    const senhaAtual = document.getElementById('senha-atual').value;
    const novaSenha = document.getElementById('nova-senha').value;
    const confirmarNovaSenha = document.getElementById('confirmar-nova-senha').value;

    if (novaSenha !== confirmarNovaSenha) {
        alert('A confirmação da nova senha não confere.');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/usuarios/alterar-senha`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuarioId: usuarioAtual.id,
                senhaAtual,
                novaSenha
            })
        });

        if (res.ok) {
            alert('Sua senha foi alterada com sucesso!');
            fecharModalMinhaSenha();
        } else {
            const err = await res.json();
            alert(err.error || 'Erro ao alterar a senha.');
        }
    } catch (e) {
        alert('Erro de conexão.');
    }
}

// --- OPERAÇÕES DE HORAS EXTRAS ---
async function registrarHoraExtra() {
    const idEditando = document.getElementById('he-id-editando').value;
    const totalHoras = calcularTotalHoras();

    const payload = {
        usuarioId: usuarioAtual.id,
        data: document.getElementById('he-data').value,
        inicio: document.getElementById('he-inicio').value,
        fim: document.getElementById('he-fim').value,
        sa: document.getElementById('he-sa').value,
        requerente: document.getElementById('he-requerente').value,
        tipoAcionamento: document.getElementById('he-tipo-acionamento').value,
        motivo: document.getElementById('he-motivo').value,
        totalHoras
    };

    const url = idEditando ? `${API_URL}/horas/${idEditando}` : `${API_URL}/horas`;
    const method = idEditando ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert(idEditando ? 'Registro atualizado com sucesso!' : 'Hora extra cadastrada com sucesso!');
            cancelarEdicaoHoraExtra();
            carregarMinhasHoras();
        } else {
            alert('Erro ao salvar registro.');
        }
    } catch (e) {
        alert('Erro de conexão com o servidor.');
    }
}

async function excluirHoraExtra() {
    const id = document.getElementById('he-id-editando').value;
    if (!id) return;

    if (confirm('Deseja realmente excluir este registro?')) {
        try {
            const res = await fetch(`${API_URL}/horas/${id}`, { method: 'DELETE' });
            if (res.ok) {
                alert('Registro excluído!');
                cancelarEdicaoHoraExtra();
                carregarMinhasHoras();
            }
        } catch (e) {
            alert('Erro de conexão.');
        }
    }
}

async function carregarMinhasHoras() {
    const tbody = document.getElementById('lista-minhas-horas');
    tbody.innerHTML = '';

    try {
        const res = await fetch(`${API_URL}/horas?usuarioId=${usuarioAtual.id}&ehAdmin=false`);
        const horas = await res.json();

        if (!Array.isArray(horas) || horas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-slate-400">Nenhuma hora extra registrada.</td></tr>`;
            return;
        }

        horas.forEach(h => {
            const hEscapado = JSON.stringify(h).replace(/'/g, "&apos;");
            const ehPago = h.status === 'Pago';
            
            const statusBadge = ehPago 
                ? `<span class="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full text-xs font-semibold block w-fit">Pago</span><span class="text-[10px] text-slate-400 block mt-0.5">${h.dataPagamento || ''}</span>`
                : `<span class="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full text-xs font-semibold block w-fit">Pendente</span>`;

            const acaoBotao = ehPago 
                ? `<span class="text-xs text-slate-400 italic flex items-center gap-1 justify-end" title="Chamado já pago pelo RH. Edição bloqueada."><i data-lucide="lock" class="w-3.5 h-3.5"></i> Bloqueado</span>`
                : `<button onclick='prepararEdicaoHoraExtra(${hEscapado})' class="text-blue-600 hover:text-blue-800 p-1 font-medium text-xs flex items-center gap-1 ml-auto"><i data-lucide="pencil" class="w-3.5 h-3.5"></i> Editar</button>`;

            const htmlHorarioOrganizado = `
                <div class="font-mono text-xs text-slate-800 dark:text-slate-200">${h.inicio} - ${h.fim}</div>
                <div class="text-[11px] font-bold text-blue-600 dark:text-blue-400">(${h.totalHoras || '-'})</div>
            `;

            tbody.innerHTML += `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td class="p-3 font-medium">${formatarDataBR(h.data)}</td>
                    <td class="p-3"><span class="bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-mono text-xs">${h.sa}</span></td>
                    <td class="p-3 font-medium">${h.requerente || '-'}</td>
                    <td class="p-3 whitespace-nowrap">${htmlHorarioOrganizado}</td>
                    <td class="p-3 text-center">${formatarSituacaoCompacta(h.tipoAcionamento)}</td>
                    <td class="p-3">${h.motivo}</td>
                    <td class="p-3">${statusBadge}</td>
                    <td class="p-3 text-right">${acaoBotao}</td>
                </tr>
            `;
        });
        lucide.createIcons();
    } catch (e) {
        console.error(e);
    }
}

function prepararEdicaoHoraExtra(registro) {
    if (registro.status === 'Pago') {
        alert('Este chamado já foi marcado como PAGO pelo RH e não pode mais ser editado.');
        return;
    }

    if (!podeEditarRegistro(registro)) {
        alert('Atenção: Você só pode editar os registros criados por você.');
        return;
    }

    document.getElementById('he-id-editando').value = registro.id;
    document.getElementById('he-data').value = registro.data;
    document.getElementById('he-inicio').value = registro.inicio;
    document.getElementById('he-fim').value = registro.fim;
    document.getElementById('he-sa').value = registro.sa;
    
    document.getElementById('he-requerente').value = registro.requerente || '';
    
    const tipoAcionamentoSelect = document.getElementById('he-tipo-acionamento');
    const valorRegistro = registro.tipoAcionamento || '';
    
    let encontrouOpcao = false;
    for (let i = 0; i < tipoAcionamentoSelect.options.length; i++) {
        if (tipoAcionamentoSelect.options[i].value === valorRegistro) {
            tipoAcionamentoSelect.selectedIndex = i;
            encontrouOpcao = true;
            break;
        }
    }
    
    if (!encontrouOpcao) {
        if (valorRegistro.includes("Sim, estou de sobreaviso")) {
            tipoAcionamentoSelect.value = "1 - Sim, estou de sobreaviso";
        } else if (valorRegistro.includes("Não, porém fui acionado")) {
            tipoAcionamentoSelect.value = "2 - Não, porém fui acionado fora do horário comercial";
        } else {
            tipoAcionamentoSelect.value = "";
        }
    }

    document.getElementById('he-motivo').value = registro.motivo;

    calcularTotalHoras();

    document.getElementById('titulo-form-he').innerText = "Editar Hora Extra";
    document.getElementById('btn-salvar-he-texto').innerText = "Atualizar Registro";
    document.getElementById('acoes-edicao-he').classList.remove('hidden');

    if (document.getElementById('tab-content-horas').classList.contains('hidden')) {
        alternarAba('horas');
    }
    
    document.getElementById('form-hora-extra').scrollIntoView({ behavior: 'smooth' });
    lucide.createIcons();
}

function cancelarEdicaoHoraExtra() {
    document.getElementById('form-hora-extra').reset();
    document.getElementById('he-id-editando').value = "";
    document.getElementById('he-total-horas').value = "";
    document.getElementById('titulo-form-he').innerText = "Registrar Nova Hora Extra";
    document.getElementById('btn-salvar-he-texto').innerText = "Salvar Horas";
    document.getElementById('acoes-edicao-he').classList.add('hidden');
}

// --- MÓDULO RECURSOS HUMANOS (RH) ---
async function carregarUsuariosNoFiltroRH() {
    try {
        const res = await fetch(`${API_URL}/usuarios`);
        const usuarios = await res.json();
        
        listaCompletaUsuariosRH = usuarios.filter(u => {
            let roles = u.roles || [];
            if (typeof roles === 'string') {
                try { roles = JSON.parse(roles); } catch(e) { roles = [roles]; }
            }
            return !(roles.includes('tecnico') && roles.length === 1);
        });

        populacaoOpcoesColaboradoresRH();
    } catch (e) {
        console.error('Erro ao popular colaboradores do RH:', e);
    }
}

function populacaoOpcoesColaboradoresRH() {
    const selectGrupo = document.getElementById('rh-filtro-grupo').value;
    const selectUsuario = document.getElementById('rh-filtro-usuario');
    if (!selectUsuario) return;

    selectUsuario.innerHTML = '<option value="todos">Todos os Colaboradores</option>';

    const filtrados = listaCompletaUsuariosRH.filter(u => {
        if (selectGrupo === 'todos') return true;
        let roles = u.roles || [];
        if (typeof roles === 'string') {
            try { roles = JSON.parse(roles); } catch(e) { roles = [roles]; }
        }
        return roles.includes(selectGrupo);
    });

    filtrados.forEach(u => {
        selectUsuario.innerHTML += `<option value="${u.id}">${u.nome}</option>`;
    });
}

function aoMudarGrupoFiltroRH() {
    populacaoOpcoesColaboradoresRH();
    carregarHorasRH();
}

async function carregarHorasRH() {
    const grupo = document.getElementById('rh-filtro-grupo').value;
    const usuarioId = document.getElementById('rh-filtro-usuario').value;
    const dataInicio = document.getElementById('rh-filtro-inicio').value;
    const dataFim = document.getElementById('rh-filtro-fim').value;
    const status = document.getElementById('rh-filtro-status').value;

    let url = `/api/relatorio-rh?grupo=${grupo}&usuarioId=${usuarioId}&dataInicio=${dataInicio}&dataFim=${dataFim}&status=${status}`;

    try {
        const res = await fetch(url);
        const lista = await res.json();
        const tbody = document.getElementById('lista-horas-rh');
        tbody.innerHTML = '';

        if (!Array.isArray(lista) || lista.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="p-4 text-center text-slate-500">Nenhum chamado encontrado.</td></tr>`;
            return;
        }

        lista.forEach(item => {
            const sit = item.tipoAcionamento && item.tipoAcionamento.startsWith('1') ? '1' : '2';
            const statusCor = item.status === 'Pago' 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30';

            const htmlHorarioOrganizado = `
                <div class="font-mono text-xs text-slate-800 dark:text-slate-200">${item.inicio} - ${item.fim}</div>
                <div class="text-[11px] font-bold text-blue-600 dark:text-blue-400">(${item.totalHoras})</div>
            `;

            tbody.innerHTML += `
                <tr id="linha-rh-${item.id}" class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">${item.usuarioNome}</td>
                    <td class="p-3 font-mono">${formatarDataBR(item.data)}</td>
                    <td class="p-3"><span class="bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono px-2 py-0.5 rounded">${item.sa}</span></td>
                    <td class="p-3 whitespace-nowrap">${htmlHorarioOrganizado}</td>
                    <td class="p-3 text-center"><span class="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">${sit}</span></td>
                    <td class="p-3 max-w-xs truncate" title="${item.motivo}">${item.motivo}</td>
                    
                    <!-- COLUNA ADICIONAL H.E. (50% PADRÃO COM ALTERNÂNCIA LOCAL) -->
                    <td class="p-3 text-center whitespace-nowrap col-adicional" data-percentual="50">
                        <div class="flex items-center justify-center gap-2">
                            <span class="badge-percentual px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                50%
                            </span>
                            <button onclick="alternarAdicionalHE(${item.id})" class="px-2 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded text-[11px] font-semibold transition cursor-pointer" title="Alternar entre 50% e 100%">
                                Mudar p/ 100%
                            </button>
                        </div>
                    </td>

                    <td class="p-3 col-status"><span class="px-2 py-1 rounded-full text-xs font-bold ${statusCor}">${item.status}</span></td>
                    <td class="p-3 text-slate-500 col-data-pagamento">${item.dataPagamento || '-'}</td>
                    <td class="p-3 text-right col-botao">
                        <button onclick="alterarStatusPagamento(${item.id}, '${item.status === 'Pago' ? 'Pendente' : 'Pago'}')" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer">
                            ${item.status === 'Pago' ? 'Desfazer' : '✓ Pago'}
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Erro ao carregar dados do RH:", e);
    }
}

// ALTERNA O ADICIONAL H.E. LOCALMENTE NO NAVEGADOR
function alternarAdicionalHE(id) {
    const tr = document.getElementById(`linha-rh-${id}`);
    if (!tr) return;

    const colAdicional = tr.querySelector('.col-adicional');
    if (!colAdicional) return;

    const valorAtual = colAdicional.getAttribute('data-percentual') || '50';
    const eAgora100 = (valorAtual === '50'); // Se era 50, muda para 100
    const novoValor = eAgora100 ? '100' : '50';

    colAdicional.setAttribute('data-percentual', novoValor);

    const badgeCor = eAgora100 
        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30';

    colAdicional.innerHTML = `
        <div class="flex items-center justify-center gap-2">
            <span class="badge-percentual px-2 py-0.5 rounded-full text-xs font-bold ${badgeCor}">
                ${eAgora100 ? '100%' : '50%'}
            </span>
            <button onclick="alternarAdicionalHE(${id})" class="px-2 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded text-[11px] font-semibold transition cursor-pointer" title="Alternar entre 50% e 100%">
                ${eAgora100 ? 'Mudar p/ 50%' : 'Mudar p/ 100%'}
            </button>
        </div>
    `;
}

function limparFiltrosRH() {
    document.getElementById('rh-filtro-inicio').value = '';
    document.getElementById('rh-filtro-fim').value = '';
    document.getElementById('rh-filtro-status').value = 'todos';
    document.getElementById('rh-filtro-grupo').value = 'todos';
    populacaoOpcoesColaboradoresRH();
    carregarHorasRH();
}

async function alterarStatusPagamento(id, novoStatus) {
    try {
        const res = await fetch(`${API_URL}/horas/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: novoStatus })
        });

        if (res.ok) {
            const tr = document.getElementById(`linha-rh-${id}`);
            if (!tr) {
                carregarHorasRH();
                return;
            }

            const ehPago = (novoStatus === 'Pago');
            const statusCor = ehPago 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30';

            const colStatus = tr.querySelector('.col-status');
            if (colStatus) {
                colStatus.innerHTML = `<span class="px-2 py-1 rounded-full text-xs font-bold ${statusCor}">${novoStatus}</span>`;
            }

            const colData = tr.querySelector('.col-data-pagamento');
            if (colData) {
                if (ehPago) {
                    const agora = new Date();
                    const d = String(agora.getDate()).padStart(2, '0');
                    const m = String(agora.getMonth() + 1).padStart(2, '0');
                    const y = agora.getFullYear();
                    const hh = String(agora.getHours()).padStart(2, '0');
                    const mm = String(agora.getMinutes()).padStart(2, '0');
                    colData.innerText = `${d}/${m}/${y} ${hh}:${mm}`;
                } else {
                    colData.innerText = '-';
                }
            }

            const colBotao = tr.querySelector('.col-botao');
            if (colBotao) {
                const proximoStatus = ehPago ? 'Pendente' : 'Pago';
                const textoBotao = ehPago ? 'Desfazer' : '✓ Pago';
                colBotao.innerHTML = `
                    <button onclick="alterarStatusPagamento(${id}, '${proximoStatus}')" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer">
                        ${textoBotao}
                    </button>
                `;
            }
        } else {
            alert('Erro ao alterar status do pagamento.');
        }
    } catch (e) {
        alert('Erro de conexão com o servidor.');
    }
}

// EXPORTAÇÃO COMPATÍVEL COM O ADICIONAL H.E. EXIBIDO NA TELA
async function exportarRelatorioCSV() {
    const inicio = document.getElementById('rh-filtro-inicio').value;
    const fim = document.getElementById('rh-filtro-fim').value;
    const status = document.getElementById('rh-filtro-status').value;
    const grupo = document.getElementById('rh-filtro-grupo').value;
    const usuarioId = document.getElementById('rh-filtro-usuario').value;

    try {
        const url = `${API_URL}/relatorio-rh?dataInicio=${inicio}&dataFim=${fim}&status=${status}&grupo=${grupo}&usuarioId=${usuarioId}`;
        const res = await fetch(url);
        const dados = await res.json();

        if (!Array.isArray(dados) || dados.length === 0) {
            alert('Nenhum dado encontrado para gerar o relatório com os filtros atuais.');
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,Colaborador;Email;Data;Chamado;Requerente;Inicio;Fim;Total Horas;Situacao;Motivo;Adicional HE;Status Pagamento;Data Pagamento\n";

        dados.forEach(row => {
            // Tenta obter o adicional alterado na tela para a linha específica
            let adicionalTela = "50%";
            const tr = document.getElementById(`linha-rh-${row.id}`);
            if (tr) {
                const colAdicional = tr.querySelector('.col-adicional');
                if (colAdicional) {
                    const percAttr = colAdicional.getAttribute('data-percentual');
                    adicionalTela = (percAttr === '100') ? '100%' : '50%';
                }
            }

            const linha = [
                `"${row.usuarioNome}"`,
                `"${row.email}"`,
                `"${formatarDataBR(row.data)}"`,
                `"${row.sa}"`,
                `"${row.requerente || ''}"`,
                `"${row.inicio}"`,
                `"${row.fim}"`,
                `"${row.totalHoras || ''}"`,
                `"${row.tipoAcionamento || ''}"`,
                `"${row.motivo.replace(/"/g, '""')}"`,
                `"${adicionalTela}"`,
                `"${row.status}"`,
                `"${row.dataPagamento || ''}"`
            ].join(';');
            csvContent += linha + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Relatorio_RH_SIGHE_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        alert('Erro ao gerar relatório CSV.');
    }
}

// --- MÓDULO ADMINISTRATIVO ---
async function carregarUsuariosAdmin() {
    const tbody = document.getElementById('lista-usuarios');
    tbody.innerHTML = '';

    try {
        const res = await fetch(`${API_URL}/usuarios`);
        const usuarios = await res.json();

        usuarios.forEach(u => {
            const ehAtivo = u.ativo !== false;
            const badgeAtivo = ehAtivo 
                ? `<span class="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full text-xs font-semibold">Ativo</span>`
                : `<span class="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 px-2 py-0.5 rounded-full text-xs font-semibold">Inativo</span>`;

            const uEscapado = JSON.stringify(u).replace(/'/g, "&apos;");

            tbody.innerHTML += `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 ${!ehAtivo ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/30' : ''}">
                    <td class="p-3 font-medium text-slate-900 dark:text-slate-100">${u.nome}</td>
                    <td class="p-3 text-slate-600 dark:text-slate-400">${u.email}</td>
                    <td class="p-3">${formatarRolesBadges(u.roles)}</td>
                    <td class="p-3">${badgeAtivo}</td>
                    <td class="p-3 text-right">
                        <button onclick='abrirModalEditarUsuario(${uEscapado})' class="text-blue-600 hover:text-blue-800 p-1 font-medium text-xs flex items-center gap-1 ml-auto" title="Editar dados, grupos, status, redefinir senha ou excluir">
                            <i data-lucide="pencil" class="w-4 h-4"></i> Editar
                        </button>
                    </td>
                </tr>
            `;
        });
        lucide.createIcons();
    } catch (e) {
        console.error(e);
    }
}

async function carregarTodasHorasAdmin() {
    const tbody = document.getElementById('lista-todas-horas');
    tbody.innerHTML = '';

    try {
        const res = await fetch(`${API_URL}/horas?ehAdmin=true`);
        const horas = await res.json();

        if (!Array.isArray(horas) || horas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="p-4 text-center text-slate-400">Nenhum lançamento.</td></tr>`;
            return;
        }

        horas.forEach(h => {
            const podeEditar = podeEditarRegistro(h);
            const ehPago = h.status === 'Pago';
            const hEscapado = JSON.stringify(h).replace(/'/g, "&apos;");
            const nomeColaborador = h.usuarioNome || h.usuarionome || 'Usuário Sem Nome';
            
            const statusBadge = ehPago 
                ? `<span class="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full text-xs font-semibold block w-fit">Pago</span><span class="text-[10px] text-slate-400 block mt-0.5">${h.dataPagamento || ''}</span>`
                : `<span class="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full text-xs font-semibold block w-fit">Pendente</span>`;

            const acaoBotao = ehPago 
                ? `<span class="text-xs text-slate-400 italic" title="Chamado Pago. Desmarque no RH para editar.">Bloqueado</span>`
                : (podeEditar ? `<button onclick='prepararEdicaoHoraExtra(${hEscapado})' class="text-blue-600 hover:text-blue-800 p-1 font-medium text-xs flex items-center gap-1 ml-auto"><i data-lucide="pencil" class="w-3.5 h-3.5"></i> Editar</button>` : '<span class="text-xs text-slate-400 italic">Sem permissão</span>');

            const htmlHorarioOrganizado = `
                <div class="font-mono text-xs text-slate-800 dark:text-slate-200">${h.inicio} - ${h.fim}</div>
                <div class="text-[11px] font-bold text-blue-600 dark:text-blue-400">(${h.totalHoras || '-'})</div>
            `;

            tbody.innerHTML += `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td class="p-3 font-medium text-slate-900 dark:text-slate-100">${nomeColaborador}</td>
                    <td class="p-3 font-medium">${formatarDataBR(h.data)}</td>
                    <td class="p-3"><span class="bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-mono text-xs">${h.sa}</span></td>
                    <td class="p-3 font-medium">${h.requerente || '-'}</td>
                    <td class="p-3 whitespace-nowrap">${htmlHorarioOrganizado}</td>
                    <td class="p-3 text-center">${formatarSituacaoCompacta(h.tipoAcionamento)}</td>
                    <td class="p-3 text-slate-600 dark:text-slate-300">${h.motivo}</td>
                    <td class="p-3">${statusBadge}</td>
                    <td class="p-3 text-right">${acaoBotao}</td>
                </tr>
            `;
        });
        lucide.createIcons();
    } catch (e) {
        console.error(e);
    }
}

// --- GESTÃO DE COLABORADORES (NOVO / EDITAR COMPLETO / EXCLUIR) ---
function abrirModalUsuario() {
    document.getElementById('modal-usuario-titulo').innerText = "Cadastrar Colaborador";
    document.getElementById('usr-id-editando').value = "";
    document.getElementById('form-usuario').reset();
    
    document.getElementById('lbl-usr-senha').innerText = "Senha Inicial *";
    document.getElementById('usr-senha').required = true;
    document.getElementById('msg-usr-senha-edit').classList.add('hidden');
    document.getElementById('box-usr-status').classList.add('hidden');
    document.getElementById('btn-excluir-usuario').classList.add('hidden');

    document.getElementById('modal-usuario').classList.remove('hidden');
}

function abrirModalEditarUsuario(u) {
    document.getElementById('modal-usuario-titulo').innerText = "Editar Colaborador";
    document.getElementById('usr-id-editando').value = u.id;
    document.getElementById('usr-nome').value = u.nome;
    document.getElementById('usr-email').value = u.email;
    document.getElementById('usr-senha').value = "";
    
    document.getElementById('lbl-usr-senha').innerText = "Redefinir Senha (Opcional)";
    document.getElementById('usr-senha').required = false;
    document.getElementById('msg-usr-senha-edit').classList.remove('hidden');
    
    const boxStatus = document.getElementById('box-usr-status');
    boxStatus.classList.remove('hidden');
    document.getElementById('usr-ativo').value = u.ativo !== false ? "true" : "false";
    document.getElementById('btn-excluir-usuario').classList.remove('hidden');

    let roles = u.roles || [];
    if (typeof roles === 'string') {
        try { roles = JSON.parse(roles); } catch(e) { roles = [roles]; }
    }

    document.getElementById('usr-amt').checked = roles.includes('amt');
    document.getElementById('usr-tecnico').checked = roles.includes('tecnico');
    document.getElementById('usr-externo').checked = roles.includes('externo');
    document.getElementById('usr-rh').checked = roles.includes('rh');
    document.getElementById('usr-admin').checked = roles.includes('admin');

    document.getElementById('modal-usuario').classList.remove('hidden');
}

function fecharModalUsuario() {
    document.getElementById('modal-usuario').classList.add('hidden');
    document.getElementById('form-usuario').reset();
    document.getElementById('usr-id-editando').value = "";
}

async function salvarUsuario() {
    const idEditando = document.getElementById('usr-id-editando').value;

    const roles = [];
    if (document.getElementById('usr-amt').checked) roles.push('amt');
    if (document.getElementById('usr-tecnico').checked) roles.push('tecnico');
    if (document.getElementById('usr-externo').checked) roles.push('externo');
    if (document.getElementById('usr-rh').checked) roles.push('rh');
    if (document.getElementById('usr-admin').checked) roles.push('admin');

    if (roles.length === 0) {
        alert('Selecione pelo menos um grupo de acesso.');
        return;
    }

    const payload = {
        nome: document.getElementById('usr-nome').value,
        email: document.getElementById('usr-email').value,
        roles
    };

    if (idEditando) {
        payload.ativo = document.getElementById('usr-ativo').value === 'true';
        const novaSenha = document.getElementById('usr-senha').value;
        if (novaSenha && novaSenha.trim() !== '') {
            payload.novaSenha = novaSenha;
        }
    } else {
        payload.senha = document.getElementById('usr-senha').value;
    }

    const url = idEditando ? `${API_URL}/usuarios/${idEditando}` : `${API_URL}/usuarios`;
    const method = idEditando ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            fecharModalUsuario();
            carregarUsuariosAdmin();
            carregarRequerentesAMT();
            carregarUsuariosNoFiltroRH();
        } else {
            const err = await res.json();
            alert(err.error || 'Erro ao salvar usuário.');
        }
    } catch (e) {
        alert('Erro ao conectar ao servidor.');
    }
}

async function excluirUsuarioDefinitivo() {
    const id = document.getElementById('usr-id-editando').value;
    const nome = document.getElementById('usr-nome').value;

    if (!id) return;

    if (confirm(`ATENÇÃO: Deseja realmente excluir permanentemente a conta de "${nome}"?\n\nCaso ele possua chamados salvos, o sistema impedirá a exclusão física e sugerimos alterar o status para "Inativo" para preservar o histórico.`)) {
        try {
            const res = await fetch(`${API_URL}/usuarios/${id}`, { method: 'DELETE' });
            
            if (res.ok) {
                alert('Colaborador excluído com sucesso!');
                fecharModalUsuario();
                carregarUsuariosAdmin();
                carregarRequerentesAMT();
                carregarUsuariosNoFiltroRH();
            } else {
                const err = await res.json();
                alert(err.error || 'Não foi possível excluir a conta.');
            }
        } catch (e) {
            alert('Erro de conexão ao tentar excluir.');
        }
    }
}

function formatarRoles(roles) {
    const map = { amt: 'Analista AMT', tecnico: 'Técnico AMT', externo: 'Analista Externo', rh: 'Recursos Humanos (RH)', admin: 'Administrador' };
    if (typeof roles === 'string') {
        try { roles = JSON.parse(roles); } catch(e) { roles = [roles]; }
    }
    return (roles || []).map(r => map[r]).join(' / ');
}

function formatarRolesBadges(roles) {
    const styles = {
        amt: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300',
        tecnico: 'bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300',
        externo: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300',
        rh: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300',
        admin: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300'
    };
    const labels = { amt: 'Analista AMT', tecnico: 'Técnico AMT', externo: 'Analista Externo', rh: 'RH', admin: 'Administrador' };
    if (typeof roles === 'string') {
        try { roles = JSON.parse(roles); } catch(e) { roles = [roles]; }
    }
    return (roles || []).map(r => `<span class="px-2 py-0.5 rounded-full text-xs font-semibold ${styles[r]} mr-1">${labels[r]}</span>`).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    carregarTemaSalvo();
    if (window.lucide) {
        lucide.createIcons();
    }
});