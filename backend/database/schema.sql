-- ============================================================================
-- AWS Simulator Database Schema
-- Version: 1.0.0
-- ============================================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- índices de busca textual (trigram)

-- ============================================================================
-- ENUMS — garante integridade dos valores categóricos
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE certification_type AS ENUM (
        'CLF-C02', 'SAA-C03', 'SAP-C02',
        'DVA-C02', 'SOA-C02', 'DOP-C02',
        'ANS-C01', 'DAS-C01', 'MLS-C01',
        'SCS-C02', 'PAS-C01', 'AIF-C01'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE session_type AS ENUM ('focus', 'short_break', 'long_break');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- TABELA: users
-- Usuários anônimos do simulador
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    anonymous_name  VARCHAR(100) UNIQUE,                          -- mantido para compatibilidade; nullable após migração
    email           VARCHAR(120) UNIQUE,                          -- email corporativo @a3data
    full_name       VARCHAR(150),                                 -- nome completo real
    nickname        VARCHAR(60),                                  -- apelido público (leaderboard, gamificação)
    role            VARCHAR(20)  NOT NULL DEFAULT 'STUDENT'
                                 CHECK (role IN ('STUDENT', 'VALIDATOR', 'ADMIN')),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login      TIMESTAMP,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Índices para os novos campos
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email    ON users(email)    WHERE email    IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname) WHERE nickname IS NOT NULL;
CREATE INDEX        IF NOT EXISTS idx_users_role     ON users(role);
CREATE INDEX        IF NOT EXISTS idx_users_active   ON users(is_active) WHERE is_active = TRUE;

-- Adiciona colunas idempotentemente caso a tabela já exista sem elas
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email      VARCHAR(120),
    ADD COLUMN IF NOT EXISTS full_name  VARCHAR(150),
    ADD COLUMN IF NOT EXISTS nickname   VARCHAR(60),
    ADD COLUMN IF NOT EXISTS role       VARCHAR(20) NOT NULL DEFAULT 'STUDENT',
    ADD COLUMN IF NOT EXISTS is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Garante o CHECK de role (idempotente via DO block)
DO $$ BEGIN
    ALTER TABLE users ADD CONSTRAINT chk_users_role
        CHECK (role IN ('STUDENT', 'VALIDATOR', 'ADMIN'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TABLE  users                IS 'Usuários da plataforma CloudAcademy A3Data';
COMMENT ON COLUMN users.id             IS 'Identificador único do usuário (UUID v4)';
COMMENT ON COLUMN users.anonymous_name IS 'Nome público legado — substituído por nickname';
COMMENT ON COLUMN users.email          IS 'Email corporativo @a3data (obrigatório para login)';
COMMENT ON COLUMN users.full_name      IS 'Nome completo real do usuário';
COMMENT ON COLUMN users.nickname       IS 'Apelido público exibido no leaderboard e gamificação';
COMMENT ON COLUMN users.role           IS 'Perfil de acesso: STUDENT | VALIDATOR | ADMIN';
COMMENT ON COLUMN users.is_active      IS 'FALSE = usuário desativado';
COMMENT ON COLUMN users.last_login     IS 'Data e hora do último login';
COMMENT ON COLUMN users.created_at     IS 'Data de criação do registro';
COMMENT ON COLUMN users.updated_at     IS 'Data da última atualização';

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- TABELA: domains
-- Domínios/tópicos de cada certificação AWS
-- ============================================================================

CREATE TABLE IF NOT EXISTS domains (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    certification    certification_type NOT NULL,
    name             VARCHAR(100) NOT NULL,
    slug             VARCHAR(100) NOT NULL,
    weight_percent   DECIMAL(5,2),                 -- peso no exame real (%)
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    UNIQUE (certification, slug)
);

COMMENT ON TABLE  domains                  IS 'Domínios e subdomínios de cada certificação AWS';
COMMENT ON COLUMN domains.certification    IS 'Código da certificação AWS';
COMMENT ON COLUMN domains.name             IS 'Nome legível do domínio (ex: "Security, Identity, and Compliance")';
COMMENT ON COLUMN domains.slug             IS 'Slug normalizado para uso interno (ex: "security")';
COMMENT ON COLUMN domains.weight_percent   IS 'Peso percentual do domínio no exame oficial';

CREATE INDEX IF NOT EXISTS idx_domains_certification ON domains(certification);

-- ============================================================================
-- TABELA: questions
-- Banco de questões de certificação AWS
-- ============================================================================

CREATE TABLE IF NOT EXISTS questions (
    id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    certification   certification_type NOT NULL,
    domain          VARCHAR(100)      NOT NULL,
    domain_id       UUID              REFERENCES domains(id) ON DELETE SET NULL,
    difficulty      difficulty_level  NOT NULL,
    question_text   TEXT              NOT NULL,
    options         JSONB             NOT NULL,       -- [{id, text}, ...]
    correct_answer  JSONB             NOT NULL,       -- [id] ou [id, id] para múltipla escolha
    explanation     TEXT              NOT NULL,
    reference_url   TEXT,
    tags            TEXT[]            DEFAULT '{}',
    is_active       BOOLEAN           NOT NULL DEFAULT TRUE,
    validation_status VARCHAR(20)     NOT NULL DEFAULT 'PENDING',
    rejection_reason TEXT,
    validation_logs JSONB             NOT NULL DEFAULT '[]'::jsonb,
    validated_by    VARCHAR(100),
    validated_at    TIMESTAMP,
    created_at      TIMESTAMP         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP         NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_options_not_empty    CHECK (jsonb_array_length(options) >= 2),
    CONSTRAINT chk_correct_not_empty    CHECK (jsonb_array_length(correct_answer) >= 1),
    CONSTRAINT chk_question_text_len    CHECK (char_length(question_text) >= 10),
    CONSTRAINT chk_validation_status    CHECK (validation_status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

COMMENT ON TABLE  questions                IS 'Banco de questões de certificação AWS';
COMMENT ON COLUMN questions.options        IS 'Array JSON: [{\"id\":\"A\",\"text\":\"...\"}, ...]';
COMMENT ON COLUMN questions.correct_answer IS 'Array JSON com ID(s) correto(s): [\"A\"] ou [\"A\",\"C\"]';
COMMENT ON COLUMN questions.tags           IS 'Tags livres para agrupamento (ex: {S3, IAM, VPC})';
COMMENT ON COLUMN questions.is_active      IS 'FALSE = questão desativada/aposentada';
COMMENT ON COLUMN questions.domain_id      IS 'FK para tabela domains (opcional, complementa domain text)';

ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (validation_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS validation_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS validated_by_id UUID REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN questions.validation_status IS 'Status de validacao da questao: PENDING, APPROVED ou REJECTED';
COMMENT ON COLUMN questions.rejection_reason  IS 'Motivo informado quando a questao e rejeitada na validacao';
COMMENT ON COLUMN questions.validation_logs   IS 'Historico JSON de eventos de validacao da questao';
COMMENT ON COLUMN questions.validated_by_id   IS 'FK para o usuário VALIDATOR que realizou a validação';

CREATE INDEX IF NOT EXISTS idx_questions_certification ON questions(certification);
CREATE INDEX IF NOT EXISTS idx_questions_domain        ON questions(domain);
CREATE INDEX IF NOT EXISTS idx_questions_domain_id     ON questions(domain_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty    ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_validation_status ON questions(validation_status);
CREATE INDEX IF NOT EXISTS idx_questions_validated     ON questions(validated_by);
CREATE INDEX IF NOT EXISTS idx_questions_active        ON questions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_questions_tags          ON questions USING GIN(tags);
-- Busca full-text no enunciado
CREATE INDEX IF NOT EXISTS idx_questions_text_search   ON questions USING GIN(to_tsvector('portuguese', question_text));

CREATE OR REPLACE TRIGGER trg_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- TABELA: quiz_history
-- Histórico de quizzes realizados
-- ============================================================================

CREATE TABLE IF NOT EXISTS quiz_history (
    id               UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    certification    certification_type NOT NULL,
    score            INTEGER           NOT NULL CHECK (score >= 0),
    total_questions  INTEGER           NOT NULL CHECK (total_questions > 0),
    percentage       DECIMAL(5,2)      NOT NULL CHECK (percentage BETWEEN 0 AND 100),
    domain_scores    JSONB             NOT NULL DEFAULT '{}',  -- {domain: {score, total}}
    weak_domains     TEXT[]            DEFAULT '{}',
    time_spent_secs  INTEGER           CHECK (time_spent_secs >= 0),
    completed_at     TIMESTAMP         NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_score_lte_total CHECK (score <= total_questions)
);

COMMENT ON TABLE  quiz_history                   IS 'Histórico de quizzes realizados pelos usuários';
COMMENT ON COLUMN quiz_history.domain_scores     IS 'JSON: {\"EC2\": {\"score\": 3, \"total\": 5}, ...}';
COMMENT ON COLUMN quiz_history.weak_domains      IS 'Domínios com < 70% de acerto neste quiz';
COMMENT ON COLUMN quiz_history.time_spent_secs   IS 'Tempo total gasto no quiz em segundos';

CREATE INDEX IF NOT EXISTS idx_quiz_history_user          ON quiz_history(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_history_certification ON quiz_history(certification);
CREATE INDEX IF NOT EXISTS idx_quiz_history_completed     ON quiz_history(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_history_percentage    ON quiz_history(percentage DESC);

-- ============================================================================
-- TABELA: answers
-- Respostas individuais de cada questão dentro de um quiz
-- ============================================================================

CREATE TABLE IF NOT EXISTS answers (
    id           UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id      UUID      NOT NULL REFERENCES quiz_history(id) ON DELETE CASCADE,
    question_id  UUID      REFERENCES questions(id) ON DELETE SET NULL,
    user_answer  JSONB     NOT NULL,    -- [id] ou [id, id]
    is_correct   BOOLEAN   NOT NULL,
    time_secs    INTEGER   CHECK (time_secs >= 0),
    answered_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  answers             IS 'Respostas individuais de cada questão em um quiz';
COMMENT ON COLUMN answers.user_answer IS 'Array JSON com ID(s) escolhido(s) pelo usuário: [\"B\"]';
COMMENT ON COLUMN answers.time_secs   IS 'Tempo gasto nesta questão em segundos';

CREATE INDEX IF NOT EXISTS idx_answers_quiz     ON answers(quiz_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_correct  ON answers(is_correct);

-- ============================================================================
-- TABELA: gamification
-- Pontuação, badges e progresso de cada usuário
-- ============================================================================

CREATE TABLE IF NOT EXISTS gamification (
    id                UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    total_quizzes     INTEGER   NOT NULL DEFAULT 0 CHECK (total_quizzes >= 0),
    best_score        DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (best_score BETWEEN 0 AND 100),
    current_streak    INTEGER   NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
    longest_streak    INTEGER   NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
    last_date         DATE,
    badges            TEXT[]    NOT NULL DEFAULT '{}',
    completed_stages  TEXT[]    NOT NULL DEFAULT '{}',
    unlocked_stages   TEXT[]    NOT NULL DEFAULT '{}',
    labs_completed    INTEGER   NOT NULL DEFAULT 0 CHECK (labs_completed >= 0),
    xp_points         INTEGER   NOT NULL DEFAULT 0 CHECK (xp_points >= 0),
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_streak_consistency CHECK (current_streak <= longest_streak)
);

COMMENT ON TABLE  gamification                IS 'Dados de gamificação e progresso do usuário';
COMMENT ON COLUMN gamification.best_score     IS 'Melhor percentual de acerto em qualquer quiz';
COMMENT ON COLUMN gamification.current_streak IS 'Dias consecutivos de estudo ativos';
COMMENT ON COLUMN gamification.longest_streak IS 'Maior sequência de dias consecutivos já alcançada';
COMMENT ON COLUMN gamification.badges         IS 'Array de códigos de badges desbloqueados';
COMMENT ON COLUMN gamification.xp_points      IS 'Pontos de experiência acumulados';

CREATE INDEX IF NOT EXISTS idx_gamification_user   ON gamification(user_id);
CREATE INDEX IF NOT EXISTS idx_gamification_xp     ON gamification(xp_points DESC);
CREATE INDEX IF NOT EXISTS idx_gamification_streak ON gamification(current_streak DESC);

CREATE OR REPLACE TRIGGER trg_gamification_updated_at
    BEFORE UPDATE ON gamification
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- TABELA: focus_sessions
-- Histórico de sessões Pomodoro
-- ============================================================================

CREATE TABLE IF NOT EXISTS focus_sessions (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    minutes      INTEGER      NOT NULL CHECK (minutes > 0),
    session_type session_type NOT NULL,
    session_date DATE         NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  focus_sessions              IS 'Histórico de sessões de foco Pomodoro';
COMMENT ON COLUMN focus_sessions.session_type IS 'Tipo: focus | short_break | long_break';

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_date ON focus_sessions(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_type ON focus_sessions(session_type);

-- ============================================================================
-- VIEW: leaderboard
-- Ranking público de usuários por XP
-- ============================================================================

CREATE OR REPLACE VIEW leaderboard AS
SELECT
    COALESCE(u.nickname, u.anonymous_name, 'Usuário') AS display_name,
    g.xp_points,
    g.best_score,
    g.total_quizzes,
    g.current_streak,
    g.badges,
    RANK() OVER (ORDER BY g.xp_points DESC) AS rank
FROM gamification g
JOIN users u ON u.id = g.user_id
WHERE u.is_active = TRUE OR u.is_active IS NULL
ORDER BY g.xp_points DESC;

COMMENT ON VIEW leaderboard IS 'Ranking público de usuários por pontos de XP — exibe nickname sem expor identidade real';

-- ============================================================================
-- VIEW: user_stats
-- Estatísticas consolidadas por usuário
-- ============================================================================

CREATE OR REPLACE VIEW user_stats AS
WITH quiz_stats AS (
    SELECT
        user_id,
        COUNT(*)                                             AS total_quizzes,
        COALESCE(AVG(percentage), 0)::DECIMAL(5,2)           AS avg_score,
        COALESCE(MAX(percentage), 0)                         AS best_score,
        COALESCE(SUM(time_spent_secs), 0)                    AS total_time_secs,
        COUNT(DISTINCT certification)                        AS certifications_practiced
    FROM quiz_history
    GROUP BY user_id
),
focus_stats AS (
    SELECT
        user_id,
        COALESCE(SUM(minutes) FILTER (WHERE session_type = 'focus'), 0) AS total_focus_minutes
    FROM focus_sessions
    GROUP BY user_id
)
SELECT
    u.id              AS user_id,
    COALESCE(u.nickname, u.anonymous_name, 'Usuário') AS display_name,
    u.nickname,
    u.anonymous_name,
    u.role,
    COALESCE(qs.total_quizzes, 0)                            AS total_quizzes,
    COALESCE(qs.avg_score, 0)::DECIMAL(5,2)                  AS avg_score,
    COALESCE(qs.best_score, 0)                               AS best_score,
    COALESCE(qs.total_time_secs, 0)                          AS total_time_secs,
    COALESCE(qs.certifications_practiced, 0)                 AS certifications_practiced,
    COALESCE(fs.total_focus_minutes, 0)                      AS total_focus_minutes
FROM users u
LEFT JOIN quiz_stats qs ON qs.user_id = u.id
LEFT JOIN focus_stats fs ON fs.user_id = u.id;

COMMENT ON VIEW user_stats IS 'Estatísticas consolidadas de cada usuário';

-- ============================================================================
-- DADOS INICIAIS: domínios de todas as certificações
-- Slugs correspondem ao campo "domain" nos JSONs de questões
-- ============================================================================

INSERT INTO domains (certification, name, slug, weight_percent) VALUES
    -- CLF-C02 (9 domínios)
    ('CLF-C02', 'Conceitos de Cloud',           'conceitos-cloud',          24),
    ('CLF-C02', 'Segurança',                    'seguranca',                30),
    ('CLF-C02', 'Tecnologia',                   'tecnologia',               34),
    ('CLF-C02', 'Faturamento',                  'faturamento',              12),
    ('CLF-C02', 'Rede',                         'rede',                     NULL),
    ('CLF-C02', 'Operações',                    'operacoes',                NULL),
    ('CLF-C02', 'Automação',                    'automacao',                NULL),
    ('CLF-C02', 'Arquitetura',                  'arquitetura',              NULL),
    ('CLF-C02', 'Inteligência Artificial',      'inteligencia-artificial',  NULL),
    -- SAA-C03 (6 domínios)
    ('SAA-C03', 'Design de Custo',              'design-custo',             20),
    ('SAA-C03', 'Design de Performance',        'design-performance',       24),
    ('SAA-C03', 'Design Resiliente',            'design-resiliente',        26),
    ('SAA-C03', 'Segurança de Aplicações',      'seguranca-aplicacoes',     30),
    ('SAA-C03', 'Fundamentos AI/ML',            'fundamentals-ai-ml',       NULL),
    ('SAA-C03', 'Security, Compliance e Governance', 'security-compliance-governance', NULL),
    -- DVA-C02 (4 domínios)
    ('DVA-C02', 'Desenvolvimento de Serviços',  'desenvolvimento-servicos', 32),
    ('DVA-C02', 'Implementação',                'implementacao',            22),
    ('DVA-C02', 'Resolução de Problemas',       'resolucao-problemas',      24),
    ('DVA-C02', 'Segurança de Aplicações',      'seguranca-app',            22),
    -- AIF-C01 (5 domínios)
    ('AIF-C01', 'Fundamentos de AI/ML',         'fundamentals-ai-ml',       NULL),
    ('AIF-C01', 'Fundamentos de IA Generativa', 'fundamentals-genai',       NULL),
    ('AIF-C01', 'Aplicações de Foundation Models', 'applications-foundation-models', NULL),
    ('AIF-C01', 'Diretrizes de IA Responsável', 'guidelines-responsible-ai', NULL),
    ('AIF-C01', 'Security, Compliance e Governance', 'security-compliance-governance', NULL)
ON CONFLICT (certification, slug) DO NOTHING;

-- ============================================================================
-- PRACTICE DOMAIN — Cases / Arquiteturas na Prática
-- Version: 1.0.0
-- ============================================================================

-- ============================================================================
-- ENUM: difficulty_case
-- Reutiliza difficulty_level se já existir; cria alias semântico via view
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE case_difficulty AS ENUM (
        'beginner', 'intermediate', 'advanced',
        'level_1_clf', 'level_2_saa', 'level_3_dva', 'level_4_sys',
        'level_5_sec', 'level_6_data', 'level_7_ai', 'level_8_adv',
        'investigative'
    );
EXCEPTION WHEN duplicate_object THEN
    -- Fallback to add values if enum already exists
    ALTER TYPE case_difficulty ADD VALUE IF NOT EXISTS 'level_1_clf';
    ALTER TYPE case_difficulty ADD VALUE IF NOT EXISTS 'level_2_saa';
    ALTER TYPE case_difficulty ADD VALUE IF NOT EXISTS 'level_3_dva';
    ALTER TYPE case_difficulty ADD VALUE IF NOT EXISTS 'level_4_sys';
    ALTER TYPE case_difficulty ADD VALUE IF NOT EXISTS 'level_5_sec';
    ALTER TYPE case_difficulty ADD VALUE IF NOT EXISTS 'level_6_data';
    ALTER TYPE case_difficulty ADD VALUE IF NOT EXISTS 'level_7_ai';
    ALTER TYPE case_difficulty ADD VALUE IF NOT EXISTS 'level_8_adv';
    ALTER TYPE case_difficulty ADD VALUE IF NOT EXISTS 'investigative';
END $$;

-- ============================================================================
-- TABELA: aws_services
-- Catálogo de serviços AWS utilizados nos cases
-- ============================================================================

CREATE TABLE IF NOT EXISTS aws_services (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            VARCHAR(80) NOT NULL UNIQUE,      -- ex: 'amazon-s3'
    name            VARCHAR(120) NOT NULL,             -- ex: 'Amazon S3'
    category        VARCHAR(80) NOT NULL,              -- ex: 'Storage'
    short_desc      TEXT        NOT NULL,
    icon_url        TEXT,                              -- URL do ícone SVG oficial
    doc_url         TEXT,                              -- Link docs.aws.amazon.com
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  aws_services            IS 'Catálogo de serviços AWS para uso nos casos de arquitetura';
COMMENT ON COLUMN aws_services.slug       IS 'Slug único do serviço (ex: amazon-s3, aws-lambda)';
COMMENT ON COLUMN aws_services.category   IS 'Categoria do serviço (Compute, Storage, Database, ...)';
COMMENT ON COLUMN aws_services.icon_url   IS 'URL pública do ícone SVG do serviço';
COMMENT ON COLUMN aws_services.doc_url    IS 'URL para a documentação oficial AWS';

CREATE INDEX IF NOT EXISTS idx_aws_services_slug     ON aws_services(slug);
CREATE INDEX IF NOT EXISTS idx_aws_services_category ON aws_services(category);
CREATE INDEX IF NOT EXISTS idx_aws_services_active   ON aws_services(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- TABELA: cases
-- Estudos de caso de arquitetura AWS
-- ============================================================================

CREATE TABLE IF NOT EXISTS cases (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    slug                VARCHAR(120)    NOT NULL UNIQUE,
    title               VARCHAR(200)    NOT NULL,
    scenario            TEXT            NOT NULL,       -- Contexto do problema
    objective           TEXT            NOT NULL,       -- O que o aluno deve aprender
    difficulty          case_difficulty NOT NULL DEFAULT 'intermediate',
    certifications      TEXT[]          NOT NULL DEFAULT '{}',  -- ex: {CLF-C02, SAA-C03}
    architecture_graph  JSONB           NOT NULL DEFAULT '{}',  -- {type: 'mermaid', content: '...'}
    resources           JSONB           NOT NULL DEFAULT '[]',  -- [{type, title, url}]
    tags                TEXT[]          NOT NULL DEFAULT '{}',
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    -- Simulator properties
    budget_usd          DECIMAL(10,2),                  -- Orçamento fictício mensal (ex: 2000.00)
    client_persona      JSONB           NOT NULL DEFAULT '{}', -- {name, role, avatar}
    constraints         TEXT[]          NOT NULL DEFAULT '{}', -- ex: {"zero infra management"}
    
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  cases                      IS 'Estudos de caso práticos de arquitetura AWS';
COMMENT ON COLUMN cases.slug                 IS 'Slug único para uso em URL (ex: serverless-api-gateway)';
COMMENT ON COLUMN cases.scenario             IS 'Descrição do problema / contexto real do case';
COMMENT ON COLUMN cases.objective            IS 'O que o aluno vai aprender com esse case';
COMMENT ON COLUMN cases.certifications       IS 'Array de códigos de certificação relevantes';
COMMENT ON COLUMN cases.architecture_graph   IS 'Grafo da arquitetura. Ex: {type:"mermaid", content:"graph LR..."}';
COMMENT ON COLUMN cases.resources            IS 'Links externos: [{type:"doc"|"video"|"blog", title, url}]';

CREATE INDEX IF NOT EXISTS idx_cases_slug           ON cases(slug);
CREATE INDEX IF NOT EXISTS idx_cases_difficulty     ON cases(difficulty);
CREATE INDEX IF NOT EXISTS idx_cases_active         ON cases(is_active) WHERE is_active = TRUE;

CREATE OR REPLACE TRIGGER trg_cases_updated_at
    BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- TABELA: case_dialogues (Entrevista)
-- Perguntas e respostas durante a fase de briefing/entrevista
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_dialogues (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id     UUID    NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    question    TEXT    NOT NULL,
    answer      TEXT    NOT NULL,
    hints       TEXT[]  DEFAULT '{}', -- dicas reveladas por essa resposta
    sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_case_dialogues_case ON case_dialogues(case_id);

-- ============================================================================
-- TABELA: case_events (Eventos Inesperados)
-- Reviravoltas ou falhas que ocorrem após o primeiro design
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_events (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id     UUID    NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    description TEXT    NOT NULL,
    impact_type VARCHAR(50), -- ex: 'traffic_spike', 'budget_cut', 'az_failure'
    trigger_condition JSONB, -- Condições para acionar (opcional, ex: trigger após X min)
    sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_case_events_case ON case_events(case_id);

-- ============================================================================
-- TABELA: case_evaluation_criteria
-- Regras de pontuação para o caso usando Well-Architected
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_evaluation_criteria (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id         UUID    NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    service_id      UUID    NOT NULL REFERENCES aws_services(id) ON DELETE CASCADE,
    pillar          VARCHAR(50) NOT NULL, -- ex: 'security', 'reliability', 'cost', 'performance', 'operational'
    score_impact    INTEGER NOT NULL,     -- ex: +10 (bom), -5 (ruim)
    feedback_msg    TEXT    NOT NULL      -- ex: "Boa escolha, o S3 reduz os custos de armazenamento."
);
CREATE INDEX IF NOT EXISTS idx_case_eval_case ON case_evaluation_criteria(case_id);

CREATE OR REPLACE TRIGGER trg_cases_updated_at
    BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- TABELA: case_services
-- Relacionamento N:N entre cases e aws_services
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_services (
    case_id     UUID    NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    service_id  UUID    NOT NULL REFERENCES aws_services(id) ON DELETE CASCADE,
    role_note   TEXT,   -- Papel do serviço no case (ex: 'Armazena os objetos estáticos')
    PRIMARY KEY (case_id, service_id)
);

COMMENT ON TABLE  case_services           IS 'Serviços AWS utilizados em cada case';
COMMENT ON COLUMN case_services.role_note IS 'Descrição curta do papel do serviço neste case';

CREATE INDEX IF NOT EXISTS idx_case_services_case    ON case_services(case_id);
CREATE INDEX IF NOT EXISTS idx_case_services_service ON case_services(service_id);

-- ============================================================================
-- TABELA: case_questions
-- Relacionamento N:N entre cases e questions (questões de fixação)
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_questions (
    case_id     UUID    NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    question_id UUID    REFERENCES questions(id) ON DELETE SET NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,   -- Ordem de exibição
    PRIMARY KEY (case_id, question_id)
);

COMMENT ON TABLE  case_questions             IS 'Questões de certificação associadas a cada case';
COMMENT ON COLUMN case_questions.sort_order  IS 'Ordem de exibição das questões dentro do case';

CREATE INDEX IF NOT EXISTS idx_case_questions_case     ON case_questions(case_id);
CREATE INDEX IF NOT EXISTS idx_case_questions_question ON case_questions(question_id);

-- ============================================================================
-- TABELA: case_progress
-- Progresso do usuário por case
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_progress (
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    case_id      UUID        NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    completed    BOOLEAN     NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP,
    started_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, case_id)
);

COMMENT ON TABLE case_progress IS 'Registro de progresso do usuário em cada case prático';
