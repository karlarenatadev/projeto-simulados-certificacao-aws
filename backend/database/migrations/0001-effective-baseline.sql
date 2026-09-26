-- D4.4.2 / F2: empty PostgreSQL 16 database only; no editorial seeds.
-- Independent versioned baseline; never executed by Express or db.js.
-- case_questions: RESTRICT preserves mandatory links instead of invalid SET NULL.

CREATE EXTENSION "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION "pg_trgm";    -- índices de busca textual (trigram)

CREATE TYPE certification_type AS ENUM (
        'CLF-C02', 'SAA-C03', 'SAP-C02',
        'DVA-C02', 'SOA-C02', 'DOP-C02',
        'ANS-C01', 'DAS-C01', 'MLS-C01',
        'SCS-C02', 'PAS-C01', 'AIF-C01'
    );

CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');

CREATE TYPE session_type AS ENUM ('focus', 'short_break', 'long_break');

CREATE TABLE users (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    anonymous_name  VARCHAR(100) UNIQUE,                          -- mantido para compatibilidade; nullable após migração
    email           VARCHAR(120),                                 -- email corporativo @a3data
    full_name       VARCHAR(150),                                 -- nome completo real
    nickname        VARCHAR(60),                                  -- apelido público (leaderboard, gamificação)
    role            VARCHAR(20)  NOT NULL DEFAULT 'STUDENT'
                                 CHECK (role IN ('STUDENT', 'VALIDATOR', 'ADMIN')),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login      TIMESTAMP,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_email    ON users(lower(trim(email))) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX idx_users_nickname ON users(nickname) WHERE nickname IS NOT NULL;
CREATE INDEX        idx_users_role     ON users(role);
CREATE INDEX        idx_users_active   ON users(is_active) WHERE is_active = TRUE;

CREATE TABLE user_identities (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider       VARCHAR(40) NOT NULL,
    subject        VARCHAR(255) NOT NULL,
    email_at_link  VARCHAR(120),
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login_at  TIMESTAMP,
    UNIQUE (provider, subject)
);
CREATE INDEX idx_user_identities_user ON user_identities(user_id);

CREATE TABLE user_module_state (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module             VARCHAR(40)  NOT NULL,
    certification_id   VARCHAR(20)  NOT NULL DEFAULT '',
    state_json         JSONB        NOT NULL DEFAULT '{}',
    version            BIGINT       NOT NULL DEFAULT 1 CHECK (version > 0),
    updated_at         TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_user_module_state_module CHECK (
        module IN ('journey', 'sprint', 'flashcards', 'labs', 'diagnostic', 'preferences', 'gamification', 'mistakes')
    )
);

CREATE UNIQUE INDEX uq_user_module_state_scope
    ON user_module_state(user_id, module, certification_id);
CREATE INDEX idx_user_module_state_user
    ON user_module_state(user_id, updated_at DESC);

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

CREATE TABLE validator_requests (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    certification_id  certification_type NOT NULL,
    credential_id     VARCHAR(200),
    credential_url    TEXT,
    notes             TEXT,
    status            VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    requested_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    reviewed_at       TIMESTAMP,
    reviewed_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    review_notes      TEXT
);

CREATE UNIQUE INDEX idx_validator_requests_pending
    ON validator_requests(user_id, certification_id)
    WHERE status = 'PENDING';
CREATE INDEX idx_validator_requests_status
    ON validator_requests(status, requested_at);

CREATE TABLE validator_certifications (
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    certification_id certification_type NOT NULL,
    verified_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    source_request_id UUID REFERENCES validator_requests(id) ON DELETE SET NULL,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (user_id, certification_id)
);

CREATE TABLE role_audit_log (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    target_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action           VARCHAR(80) NOT NULL,
    old_role         VARCHAR(20),
    new_role         VARCHAR(20),
    certification_id certification_type,
    metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_role_audit_target ON role_audit_log(target_user_id, created_at);

CREATE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_module_state_updated_at
    BEFORE UPDATE ON user_module_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE domains (
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

CREATE INDEX idx_domains_certification ON domains(certification);

CREATE TABLE questions (
    id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    certification   certification_type NOT NULL,
    domain          VARCHAR(100)      NOT NULL,
    domain_id       UUID              REFERENCES domains(id) ON DELETE SET NULL,
    language        VARCHAR(2),
    source_question_id TEXT,
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
    validated_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP         NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP         NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_questions_language CHECK (language IS NULL OR language IN ('pt', 'en')),
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

COMMENT ON COLUMN questions.validation_status IS 'Status de validacao da questao: PENDING, APPROVED ou REJECTED';
COMMENT ON COLUMN questions.rejection_reason  IS 'Motivo informado quando a questao e rejeitada na validacao';
COMMENT ON COLUMN questions.validation_logs   IS 'Historico JSON de eventos de validacao da questao';
COMMENT ON COLUMN questions.validated_by_id   IS 'FK para o usuário VALIDATOR que realizou a validação';

CREATE INDEX idx_questions_certification ON questions(certification);
CREATE INDEX idx_questions_domain        ON questions(domain);
CREATE INDEX idx_questions_domain_id     ON questions(domain_id);
CREATE INDEX idx_questions_difficulty    ON questions(difficulty);
CREATE INDEX idx_questions_validation_status ON questions(validation_status);
CREATE INDEX idx_questions_validated_by_id     ON questions(validated_by_id);
CREATE INDEX idx_questions_active        ON questions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_questions_tags          ON questions USING GIN(tags);
CREATE INDEX idx_questions_language ON questions (certification, language);
CREATE INDEX idx_questions_language_domain ON questions (certification, language, domain);
CREATE UNIQUE INDEX uq_questions_editorial_identity
    ON questions (certification, language, source_question_id)
    WHERE language IS NOT NULL AND source_question_id IS NOT NULL;
CREATE INDEX idx_questions_text_search   ON questions USING GIN(to_tsvector('portuguese', question_text));

CREATE TRIGGER trg_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE quiz_history (
    id               UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    certification    certification_type NOT NULL,
    status            VARCHAR(16)       NOT NULL DEFAULT 'started',
    score            INTEGER           NOT NULL CHECK (score >= 0),
    total_questions  INTEGER           NOT NULL CHECK (total_questions > 0),
    percentage       DECIMAL(5,2)      NOT NULL CHECK (percentage BETWEEN 0 AND 100),
    domain_scores    JSONB             NOT NULL DEFAULT '{}',  -- {domain: {score, total}}
    weak_domains     TEXT[]            DEFAULT '{}',
    time_spent_secs  INTEGER           CHECK (time_spent_secs >= 0),
    started_at       TIMESTAMP         NOT NULL DEFAULT NOW(),
    completed_at     TIMESTAMP,
    abandoned_at     TIMESTAMP,

    CONSTRAINT chk_score_lte_total CHECK (score <= total_questions),
    CONSTRAINT chk_quiz_history_status
        CHECK (status IN ('started', 'completed', 'abandoned')),
    CONSTRAINT chk_quiz_history_lifecycle CHECK (
        (status = 'started' AND completed_at IS NULL AND abandoned_at IS NULL)
        OR (status = 'completed' AND completed_at IS NOT NULL AND abandoned_at IS NULL)
        OR (status = 'abandoned' AND completed_at IS NULL AND abandoned_at IS NOT NULL)
    )
);

COMMENT ON TABLE  quiz_history                   IS 'Histórico de quizzes realizados pelos usuários';
COMMENT ON COLUMN quiz_history.domain_scores     IS 'JSON: {\"EC2\": {\"score\": 3, \"total\": 5}, ...}';
COMMENT ON COLUMN quiz_history.weak_domains      IS 'Domínios com < 70% de acerto neste quiz';
COMMENT ON COLUMN quiz_history.time_spent_secs   IS 'Tempo total gasto no quiz em segundos';

CREATE INDEX idx_quiz_history_user          ON quiz_history(user_id);
CREATE INDEX idx_quiz_history_certification ON quiz_history(certification);
CREATE INDEX idx_quiz_history_status        ON quiz_history(status);
CREATE INDEX idx_quiz_history_completed     ON quiz_history(completed_at DESC);
CREATE INDEX idx_quiz_history_percentage    ON quiz_history(percentage DESC);

CREATE TABLE quiz_questions (
    quiz_id     UUID    NOT NULL REFERENCES quiz_history(id) ON DELETE CASCADE,
    question_id UUID    NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    position    INTEGER NOT NULL CHECK (position >= 0),
    PRIMARY KEY (quiz_id, question_id),
    UNIQUE (quiz_id, position)
);
CREATE INDEX idx_quiz_questions_question ON quiz_questions(question_id);

CREATE TABLE answers (
    id           UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id      UUID      NOT NULL REFERENCES quiz_history(id) ON DELETE CASCADE,
    question_id  UUID      REFERENCES questions(id) ON DELETE SET NULL,
    user_answer  JSONB     NOT NULL,    -- [id] ou [id, id]
    is_correct   BOOLEAN   NOT NULL,
    membership_enforced BOOLEAN NOT NULL DEFAULT TRUE,
    time_secs    INTEGER   CHECK (time_secs >= 0),
    answered_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  answers             IS 'Respostas individuais de cada questão em um quiz';
COMMENT ON COLUMN answers.user_answer IS 'Array JSON com ID(s) escolhido(s) pelo usuário: [\"B\"]';
COMMENT ON COLUMN answers.time_secs   IS 'Tempo gasto nesta questão em segundos';

CREATE INDEX idx_answers_quiz     ON answers(quiz_id);
CREATE INDEX idx_answers_question ON answers(question_id);
CREATE INDEX idx_answers_correct  ON answers(is_correct);
CREATE UNIQUE INDEX uq_answers_new_quiz_question
    ON answers(quiz_id, question_id)
    WHERE membership_enforced = TRUE AND question_id IS NOT NULL;

CREATE TABLE gamification (
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

CREATE INDEX idx_gamification_user   ON gamification(user_id);
CREATE INDEX idx_gamification_xp     ON gamification(xp_points DESC);
CREATE INDEX idx_gamification_streak ON gamification(current_streak DESC);

CREATE TRIGGER trg_gamification_updated_at
    BEFORE UPDATE ON gamification
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE focus_sessions (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    minutes      INTEGER      NOT NULL CHECK (minutes > 0),
    session_type session_type NOT NULL,
    session_date DATE         NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  focus_sessions              IS 'Histórico de sessões de foco Pomodoro';
COMMENT ON COLUMN focus_sessions.session_type IS 'Tipo: focus | short_break | long_break';

CREATE INDEX idx_focus_sessions_user ON focus_sessions(user_id);
CREATE INDEX idx_focus_sessions_date ON focus_sessions(session_date DESC);
CREATE INDEX idx_focus_sessions_type ON focus_sessions(session_type);

CREATE VIEW leaderboard AS
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

CREATE VIEW user_stats AS
WITH quiz_stats AS (
    SELECT
        user_id,
        COUNT(*)                                             AS total_quizzes,
        COALESCE(AVG(percentage), 0)::DECIMAL(5,2)           AS avg_score,
        COALESCE(MAX(percentage), 0)                         AS best_score,
        COALESCE(SUM(time_spent_secs), 0)                    AS total_time_secs,
        COUNT(DISTINCT certification)                        AS certifications_practiced
    FROM quiz_history
    WHERE status = 'completed'
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

CREATE TYPE case_difficulty AS ENUM (
        'beginner', 'intermediate', 'advanced',
        'level_1_clf', 'level_2_saa', 'level_3_dva', 'level_4_sys',
        'level_5_sec', 'level_6_data', 'level_7_ai', 'level_8_adv',
        'investigative'
    );

CREATE TABLE aws_services (
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

CREATE INDEX idx_aws_services_slug     ON aws_services(slug);
CREATE INDEX idx_aws_services_category ON aws_services(category);
CREATE INDEX idx_aws_services_active   ON aws_services(is_active) WHERE is_active = TRUE;

CREATE TABLE cases (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    slug                VARCHAR(120)    NOT NULL UNIQUE,
    title               VARCHAR(200)    NOT NULL,
    scenario            TEXT            NOT NULL,       -- Contexto do problema
    objective           TEXT            NOT NULL,       -- O que o aluno deve aprender
    difficulty          case_difficulty NOT NULL DEFAULT 'intermediate',
    certifications      TEXT[]          NOT NULL DEFAULT '{}',  -- ex: {CLF-C02, SAA-C03}
    architecture_graph  JSONB           NOT NULL DEFAULT '{}',  -- {type: 'mermaid', content: '...'}
    resources           JSONB           NOT NULL DEFAULT '[]',  -- [{type, title, url}]
    content_pt          JSONB           NOT NULL DEFAULT '{}',
    content_en          JSONB           NOT NULL DEFAULT '{}',
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

CREATE INDEX idx_cases_slug           ON cases(slug);
CREATE INDEX idx_cases_difficulty     ON cases(difficulty);
CREATE INDEX idx_cases_active         ON cases(is_active) WHERE is_active = TRUE;

CREATE TRIGGER trg_cases_updated_at
    BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE case_dialogues (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id     UUID    NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    question    TEXT    NOT NULL,
    answer      TEXT    NOT NULL,
    hints       TEXT[]  DEFAULT '{}', -- dicas reveladas por essa resposta
    sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_case_dialogues_case ON case_dialogues(case_id);

CREATE TABLE case_events (
    id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id     UUID    NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    description TEXT    NOT NULL,
    impact_type VARCHAR(50), -- ex: 'traffic_spike', 'budget_cut', 'az_failure'
    trigger_condition JSONB, -- Condições para acionar (opcional, ex: trigger após X min)
    sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_case_events_case ON case_events(case_id);

CREATE TABLE case_evaluation_criteria (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id         UUID    NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    service_id      UUID    NOT NULL REFERENCES aws_services(id) ON DELETE CASCADE,
    pillar          VARCHAR(50) NOT NULL, -- ex: 'security', 'reliability', 'cost', 'performance', 'operational'
    score_impact    INTEGER NOT NULL,     -- ex: +10 (bom), -5 (ruim)
    feedback_msg    TEXT    NOT NULL      -- ex: "Boa escolha, o S3 reduz os custos de armazenamento."
);
CREATE INDEX idx_case_eval_case ON case_evaluation_criteria(case_id);

CREATE TABLE case_services (
    case_id     UUID    NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    service_id  UUID    NOT NULL REFERENCES aws_services(id) ON DELETE CASCADE,
    role_note   TEXT,   -- Papel do serviço no case (ex: 'Armazena os objetos estáticos')
    PRIMARY KEY (case_id, service_id)
);

COMMENT ON TABLE  case_services           IS 'Serviços AWS utilizados em cada case';
COMMENT ON COLUMN case_services.role_note IS 'Descrição curta do papel do serviço neste case';

CREATE INDEX idx_case_services_case    ON case_services(case_id);
CREATE INDEX idx_case_services_service ON case_services(service_id);

CREATE TABLE case_questions (
    case_id     UUID    NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    question_id UUID    NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
    sort_order  INTEGER NOT NULL DEFAULT 0,   -- Ordem de exibição
    PRIMARY KEY (case_id, question_id)
);

COMMENT ON TABLE  case_questions             IS 'Questões de certificação associadas a cada case';
COMMENT ON COLUMN case_questions.sort_order  IS 'Ordem de exibição das questões dentro do case';

CREATE INDEX idx_case_questions_case     ON case_questions(case_id);
CREATE INDEX idx_case_questions_question ON case_questions(question_id);

CREATE TABLE case_progress (
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    case_id      UUID        NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    completed    BOOLEAN     NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP,
    started_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, case_id)
);

COMMENT ON TABLE case_progress IS 'Registro de progresso do usuário em cada case prático';

CREATE TABLE local_identity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_identity_id VARCHAR(126) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed')),
  migration_version INTEGER NOT NULL DEFAULT 1 CHECK (migration_version > 0),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  CHECK ((status = 'completed') = (completed_at IS NOT NULL))
);
CREATE INDEX idx_local_links_user ON local_identity_links(user_id);
