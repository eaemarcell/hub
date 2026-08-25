const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Caminho do arquivo de aplicações do Portal AMT-HUB
const APPS_FILE = path.join(__dirname, 'apps.json');

// --- ROTA DE APPS (AMT-HUB) ---
app.get('/api/apps', (req, res) => {
    if (!fs.existsSync(APPS_FILE)) {
        const defaultApps = [
            { id: 'sighe', name: 'SIGHE', url: '/sighe/', icon: 'clock', color: 'blue', isLocal: true, isDefault: true },
            { id: 'pfviewer', name: 'pfViewer', url: '/pfviewer/', icon: 'shield-check', color: 'blue', isLocal: true, isDefault: true },
            { id: 'passgen', name: 'PassGen', url: '/passgen/', icon: 'key-round', color: 'blue', isLocal: true, isDefault: true }
        ];
        try {
            fs.writeFileSync(APPS_FILE, JSON.stringify(defaultApps, null, 2));
        } catch (e) {}
        return res.json(defaultApps);
    }
    try {
        const data = fs.readFileSync(APPS_FILE, 'utf-8');
        res.json(JSON.parse(data));
    } catch (e) {
        res.status(500).json({ error: "Erro ao ler o arquivo de aplicações do servidor." });
    }
});

app.post('/api/apps', (req, res) => {
    try {
        const apps = req.body;
        if (!Array.isArray(apps)) {
            return res.status(400).json({ error: "Formato inválido. Esperado um Array." });
        }
        fs.writeFileSync(APPS_FILE, JSON.stringify(apps, null, 2));
        return res.json({ success: true });
    } catch (e) {
        return res.status(500).json({ error: "Erro ao salvar aplicação no servidor." });
    }
});

// --- BANCO DE DADOS POSTGRESQL ---
const pool = new Pool({
    user: process.env.DB_USER,
    password: String(process.env.DB_PASSWORD),
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
});

pool.on('error', (err) => console.error('Erro inesperado no PostgreSQL:', err));

// Garante colunas de suporte no banco
pool.query(`
    ALTER TABLE horas_extras ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Pendente';
    ALTER TABLE horas_extras ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMP;
    ALTER TABLE horas_extras ADD COLUMN IF NOT EXISTS percentual VARCHAR(10) DEFAULT '50';
    ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
`).catch(err => console.error("Erro ao verificar estrutura:", err));

// --- LOGIN ---
app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const result = await pool.query(
            'SELECT id, nome, email, roles, COALESCE(ativo, true) as ativo FROM usuarios WHERE LOWER(email) = LOWER($1) AND senha = $2',
            [email, senha]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'E-mail ou senha inválidos' });
        }

        const usuario = result.rows[0];

        if (!usuario.ativo) {
            return res.status(403).json({ error: 'Acesso negado: Seu usuário está inativo no sistema.' });
        }

        let roles = usuario.roles || [];
        if (typeof roles === 'string') {
            try {
                roles = JSON.parse(roles);
            } catch (e) {
                roles = roles.replace(/[\{\}\"\']/g, '').split(',').map(r => r.trim());
            }
        }

        usuario.roles = roles;

        if (roles.includes('tecnico') && !roles.includes('amt') && !roles.includes('externo') && !roles.includes('rh') && !roles.includes('admin')) {
            return res.status(403).json({ error: 'Perfil de Técnico AMT não possui permissão de login no sistema.' });
        }

        res.json(usuario);
    } catch (err) {
        console.error("Erro ao efetuar login:", err);
        res.status(500).json({ error: "Erro interno no servidor ao tentar efetuar login." });
    }
});

// --- TROCA DE SENHA DO PRÓPRIO USUÁRIO LOGADO ---
app.post('/api/usuarios/alterar-senha', async (req, res) => {
    const { usuarioId, senhaAtual, novaSenha } = req.body;
    try {
        const check = await pool.query('SELECT id FROM usuarios WHERE id = $1 AND senha = $2', [usuarioId, senhaAtual]);
        if (check.rows.length === 0) {
            return res.status(400).json({ error: 'A senha atual informada está incorreta.' });
        }

        await pool.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [novaSenha, usuarioId]);
        res.json({ message: 'Senha alterada com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- USUÁRIOS (LISTAR E CADASTRAR) ---
app.get('/api/usuarios', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nome, email, roles, COALESCE(ativo, true) as ativo FROM usuarios ORDER BY nome');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// LISTA REQUERENTES (Analista AMT + Técnico AMT)
app.get('/api/requerentes-amt', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, nome 
            FROM usuarios 
            WHERE COALESCE(ativo, true) = true 
              AND ('amt' = ANY(roles) OR 'tecnico' = ANY(roles))
            ORDER BY nome
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/usuarios', async (req, res) => {
    const { nome, email, senha, roles } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO usuarios (nome, email, senha, roles, ativo) VALUES ($1, $2, $3, $4, true) RETURNING id, nome, email, roles, ativo',
            [nome, email, senha, roles]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// EDITAR DADOS COMPLETOS DO COLABORADOR
app.put('/api/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, email, roles, ativo, novaSenha } = req.body;
    try {
        if (novaSenha && novaSenha.trim() !== '') {
            await pool.query(
                'UPDATE usuarios SET nome = $1, email = $2, roles = $3, ativo = $4, senha = $5 WHERE id = $6',
                [nome, email, roles, ativo, novaSenha, id]
            );
        } else {
            await pool.query(
                'UPDATE usuarios SET nome = $1, email = $2, roles = $3, ativo = $4 WHERE id = $5',
                [nome, email, roles, ativo, id]
            );
        }
        res.json({ message: 'Colaborador atualizado com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// EXCLUIR DEFINITIVAMENTE O USUÁRIO
app.delete('/api/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const checkHoras = await pool.query('SELECT COUNT(*) FROM horas_extras WHERE usuario_id = $1', [id]);
        const qtdChamados = parseInt(checkHoras.rows[0].count, 10);

        if (qtdChamados > 0) {
            return res.status(400).json({ 
                error: `Não é possível excluir o colaborador pois ele possui ${qtdChamados} chamado(s) registrado(s). Altere o status dele para "Inativo" para bloquear o acesso preservando o histórico.` 
            });
        }

        await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
        res.json({ message: 'Colaborador excluído com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- HORAS EXTRAS ---
app.get('/api/horas', async (req, res) => {
    const { usuarioId, ehAdmin } = req.query;
    try {
        let query = `
            SELECT h.id, h.usuario_id as "usuarioId", u.nome as "usuarioNome", u.roles, 
                   TO_CHAR(h.data_he, 'YYYY-MM-DD') as data, 
                   TO_CHAR(h.hora_inicio, 'HH24:MI') as inicio, 
                   TO_CHAR(h.hora_fim, 'HH24:MI') as fim, 
                   h.numero_sa as sa, h.motivo,
                   h.tipo_acionamento as "tipoAcionamento",
                   h.total_horas as "totalHoras",
                   h.requerente,
                   COALESCE(h.status, 'Pendente') as status,
                   TO_CHAR(h.data_pagamento, 'DD/MM/YYYY HH24:MI') as "dataPagamento"
            FROM horas_extras h
            JOIN usuarios u ON h.usuario_id = u.id
        `;
        
        const params = [];
        if (ehAdmin !== 'true') {
            query += ' WHERE h.usuario_id = $1';
            params.push(usuarioId);
        }
        
        query += ' ORDER BY h.data_he DESC, h.id DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/horas', async (req, res) => {
    const { usuarioId, data, inicio, fim, sa, motivo, tipoAcionamento, totalHoras, requerente } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO horas_extras (usuario_id, data_he, hora_inicio, hora_fim, numero_sa, motivo, tipo_acionamento, total_horas, requerente, status, percentual) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Pendente', '50') RETURNING id`,
            [usuarioId, data, inicio, fim, sa, motivo, tipoAcionamento, totalHoras, requerente]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/horas/:id', async (req, res) => {
    const { id } = req.params;
    const { data, inicio, fim, sa, motivo, tipoAcionamento, totalHoras, requerente } = req.body;
    try {
        await pool.query(
            `UPDATE horas_extras 
             SET data_he = $1, hora_inicio = $2, hora_fim = $3, numero_sa = $4, motivo = $5, 
                 tipo_acionamento = $6, total_horas = $7, requerente = $8 
             WHERE id = $9`,
            [data, inicio, fim, sa, motivo, tipoAcionamento, totalHoras, requerente, id]
        );
        res.json({ message: 'Registro atualizado com sucesso' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/horas/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM horas_extras WHERE id = $1', [id]);
        res.json({ message: 'Registro excluído com sucesso' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ROTA DE STATUS DE PAGAMENTO ---
app.all('/api/horas/:id/status', async (req, res) => {
    if (req.method !== 'PATCH' && req.method !== 'PUT' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }
    const { id } = req.params;
    const { status } = req.body;
    try {
        const dataPagamento = (status === 'Pago') ? new Date() : null;
        await pool.query(
            'UPDATE horas_extras SET status = $1, data_pagamento = $2 WHERE id = $3', 
            [status, dataPagamento, id]
        );
        res.json({ message: 'Status e data de pagamento atualizados com sucesso' });
    } catch (err) {
        console.error("Erro ao atualizar status:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- ROTA DE PERCENTUAL (ADICIONAL H.E.) ---
app.all('/api/horas/:id/percentual', async (req, res) => {
    if (req.method !== 'PATCH' && req.method !== 'PUT' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }
    const { id } = req.params;
    let { percentual } = req.body || {};
    
    if (percentual) {
        percentual = String(percentual).replace('%', '').trim();
    } else {
        percentual = '50';
    }

    try {
        await pool.query('UPDATE horas_extras SET percentual = $1 WHERE id = $2', [percentual, id]);
        res.json({ message: 'Percentual atualizado com sucesso', percentual });
    } catch (err) {
        console.error("Erro ao atualizar percentual:", err);
        res.status(500).json({ error: err.message });
    }
});

// RELATÓRIO DO RH
app.get('/api/relatorio-rh', async (req, res) => {
    const { dataInicio, dataFim, status, usuarioId, grupo } = req.query;
    try {
        let query = `
            SELECT h.id, u.nome as "usuarioNome", u.email, u.roles,
                   TO_CHAR(h.data_he, 'YYYY-MM-DD') as data, 
                   TO_CHAR(h.hora_inicio, 'HH24:MI') as inicio, 
                   TO_CHAR(h.hora_fim, 'HH24:MI') as fim, 
                   h.numero_sa as sa, h.requerente, h.tipo_acionamento as "tipoAcionamento",
                   h.total_horas as "totalHoras", h.motivo, 
                   REPLACE(COALESCE(h.percentual, '50'), '%', '') as percentual,
                   COALESCE(h.status, 'Pendente') as status,
                   TO_CHAR(h.data_pagamento, 'DD/MM/YYYY HH24:MI') as "dataPagamento",
                   h.data_pagamento as "dataPagamentoRaw"
            FROM horas_extras h
            JOIN usuarios u ON h.usuario_id = u.id
            WHERE 1=1
        `;
        const params = [];

        query += ` AND NOT ('tecnico' = ANY(u.roles) AND ARRAY_LENGTH(u.roles, 1) = 1)`;

        if (dataInicio) {
            params.push(dataInicio);
            query += ` AND h.data_he >= $${params.length}`;
        }
        if (dataFim) {
            params.push(dataFim);
            query += ` AND h.data_he <= $${params.length}`;
        }
        if (status && status !== 'todos') {
            params.push(status);
            query += ` AND COALESCE(h.status, 'Pendente') = $${params.length}`;
        }
        if (grupo && grupo !== 'todos') {
            params.push(grupo);
            query += ` AND $${params.length} = ANY(u.roles)`;
        }
        if (usuarioId && usuarioId !== 'todos') {
            params.push(usuarioId);
            query += ` AND h.usuario_id = $${params.length}`;
        }

        query += ' ORDER BY h.data_he DESC, h.id DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor API SIGHE rodando na porta ${PORT}`);
});