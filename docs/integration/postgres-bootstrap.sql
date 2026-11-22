BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> 20261009_0001

CREATE TABLE schemes (
    id UUID NOT NULL,
    slug VARCHAR(160) NOT NULL,
    name VARCHAR(255) NOT NULL,
    government_level VARCHAR(7) NOT NULL,
    state_code VARCHAR(2),
    category VARCHAR(80) NOT NULL,
    status VARCHAR(7) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_schemes PRIMARY KEY (id),
    CONSTRAINT ck_schemes_state_code_length CHECK (state_code IS NULL OR length(state_code) = 2),
    CONSTRAINT uq_schemes_slug UNIQUE (slug),
    CONSTRAINT ck_schemes_governmentlevel CHECK (government_level IN ('central', 'state')),
    CONSTRAINT ck_schemes_schemestatus CHECK (status IN ('active', 'closed', 'unknown'))
);

CREATE TABLE profile_sessions (
    id UUID NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consent_version VARCHAR(40),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_profile_sessions PRIMARY KEY (id),
    CONSTRAINT ck_profile_sessions_expiry_after_creation CHECK (expires_at > created_at)
);

CREATE TABLE admin_audit_log (
    id UUID NOT NULL,
    actor_id VARCHAR(255) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    at TIMESTAMP WITH TIME ZONE NOT NULL,
    details JSONB,
    CONSTRAINT pk_admin_audit_log PRIMARY KEY (id)
);

CREATE TABLE scheme_versions (
    id UUID NOT NULL,
    scheme_id UUID NOT NULL,
    version INTEGER NOT NULL,
    summary TEXT NOT NULL,
    benefit_text TEXT NOT NULL,
    eligibility_json JSONB NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(255),
    review_status VARCHAR(8) NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_scheme_versions PRIMARY KEY (id),
    CONSTRAINT ck_scheme_versions_positive_version CHECK (version >= 1),
    CONSTRAINT ck_scheme_versions_published_requires_verified CHECK (published_at IS NULL OR review_status = 'verified'),
    CONSTRAINT fk_scheme_versions_scheme_id_schemes FOREIGN KEY(scheme_id) REFERENCES schemes (id) ON DELETE RESTRICT,
    CONSTRAINT uq_scheme_versions_scheme_id_version UNIQUE (scheme_id, version),
    CONSTRAINT ck_scheme_versions_reviewstatus CHECK (review_status IN ('draft', 'verified', 'stale', 'rejected'))
);

CREATE TABLE profile_facts (
    session_id UUID NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    value_json JSONB NOT NULL,
    origin VARCHAR(15) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_profile_facts PRIMARY KEY (session_id, field_name),
    CONSTRAINT fk_profile_facts_session_id_profile_sessions FOREIGN KEY(session_id) REFERENCES profile_sessions (id) ON DELETE CASCADE,
    CONSTRAINT ck_profile_facts_factorigin CHECK (origin IN ('user', 'model_extracted', 'imported'))
);

CREATE TABLE match_runs (
    id UUID NOT NULL,
    session_id UUID NOT NULL,
    run_at TIMESTAMP WITH TIME ZONE NOT NULL,
    engine_version VARCHAR(80) NOT NULL,
    profile_hash VARCHAR(64) NOT NULL,
    CONSTRAINT pk_match_runs PRIMARY KEY (id),
    CONSTRAINT fk_match_runs_session_id_profile_sessions FOREIGN KEY(session_id) REFERENCES profile_sessions (id) ON DELETE CASCADE
);

CREATE TABLE saved_schemes (
    session_id UUID NOT NULL,
    scheme_id UUID NOT NULL,
    saved_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_saved_schemes PRIMARY KEY (session_id, scheme_id),
    CONSTRAINT fk_saved_schemes_scheme_id_schemes FOREIGN KEY(scheme_id) REFERENCES schemes (id) ON DELETE CASCADE,
    CONSTRAINT fk_saved_schemes_session_id_profile_sessions FOREIGN KEY(session_id) REFERENCES profile_sessions (id) ON DELETE CASCADE
);

CREATE TABLE sources (
    id UUID NOT NULL,
    scheme_version_id UUID NOT NULL,
    official_url TEXT NOT NULL,
    title VARCHAR(500) NOT NULL,
    document_date DATE,
    checked_at TIMESTAMP WITH TIME ZONE NOT NULL,
    excerpt_locator VARCHAR(500) NOT NULL,
    CONSTRAINT pk_sources PRIMARY KEY (id),
    CONSTRAINT fk_sources_scheme_version_id_scheme_versions FOREIGN KEY(scheme_version_id) REFERENCES scheme_versions (id) ON DELETE CASCADE,
    CONSTRAINT uq_sources_id_scheme_version_id UNIQUE (id, scheme_version_id)
);

CREATE TABLE match_results (
    run_id UUID NOT NULL,
    scheme_version_id UUID NOT NULL,
    verdict VARCHAR(26) NOT NULL,
    relevance_score FLOAT NOT NULL,
    rule_results JSONB NOT NULL,
    missing_fields JSONB NOT NULL,
    CONSTRAINT pk_match_results PRIMARY KEY (run_id, scheme_version_id),
    CONSTRAINT ck_match_results_relevance_score_range CHECK (relevance_score >= 0 AND relevance_score <= 1),
    CONSTRAINT fk_match_results_run_id_match_runs FOREIGN KEY(run_id) REFERENCES match_runs (id) ON DELETE CASCADE,
    CONSTRAINT fk_match_results_scheme_version_id_scheme_versions FOREIGN KEY(scheme_version_id) REFERENCES scheme_versions (id) ON DELETE RESTRICT,
    CONSTRAINT ck_match_results_verdict CHECK (verdict IN ('all_checked_conditions_met', 'needs_information', 'not_eligible', 'manual_review'))
);

CREATE TABLE eligibility_rules (
    id UUID NOT NULL,
    scheme_version_id UUID NOT NULL,
    rule_key VARCHAR(160) NOT NULL,
    expression JSONB NOT NULL,
    severity VARCHAR(13) NOT NULL,
    source_id UUID NOT NULL,
    question_template VARCHAR(500),
    CONSTRAINT pk_eligibility_rules PRIMARY KEY (id),
    CONSTRAINT fk_eligibility_rules_scheme_version_id_scheme_versions FOREIGN KEY(scheme_version_id) REFERENCES scheme_versions (id) ON DELETE CASCADE,
    CONSTRAINT fk_eligibility_rules_source_id_scheme_version_id_sources FOREIGN KEY(source_id, scheme_version_id) REFERENCES sources (id, scheme_version_id) ON DELETE RESTRICT,
    CONSTRAINT uq_eligibility_rules_scheme_version_id_rule_key UNIQUE (scheme_version_id, rule_key),
    CONSTRAINT ck_eligibility_rules_ruleseverity CHECK (severity IN ('required', 'exclusion', 'manual_review'))
);

CREATE TABLE required_documents (
    id UUID NOT NULL,
    scheme_version_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    when_required JSONB,
    source_id UUID NOT NULL,
    CONSTRAINT pk_required_documents PRIMARY KEY (id),
    CONSTRAINT fk_required_documents_scheme_version_id_scheme_versions FOREIGN KEY(scheme_version_id) REFERENCES scheme_versions (id) ON DELETE CASCADE,
    CONSTRAINT fk_required_documents_source_id_scheme_version_id_sources FOREIGN KEY(source_id, scheme_version_id) REFERENCES sources (id, scheme_version_id) ON DELETE RESTRICT,
    CONSTRAINT uq_required_documents_scheme_version_id_name UNIQUE (scheme_version_id, name)
);

CREATE TABLE application_steps (
    id UUID NOT NULL,
    scheme_version_id UUID NOT NULL,
    step_number INTEGER NOT NULL,
    instruction TEXT NOT NULL,
    official_url TEXT,
    source_id UUID NOT NULL,
    CONSTRAINT pk_application_steps PRIMARY KEY (id),
    CONSTRAINT ck_application_steps_positive_step_number CHECK (step_number >= 1),
    CONSTRAINT fk_application_steps_scheme_version_id_scheme_versions FOREIGN KEY(scheme_version_id) REFERENCES scheme_versions (id) ON DELETE CASCADE,
    CONSTRAINT fk_application_steps_source_id_scheme_version_id_sources FOREIGN KEY(source_id, scheme_version_id) REFERENCES sources (id, scheme_version_id) ON DELETE RESTRICT,
    CONSTRAINT uq_application_steps_scheme_version_id_step_number UNIQUE (scheme_version_id, step_number)
);

INSERT INTO alembic_version (version_num) VALUES ('20261009_0001') RETURNING alembic_version.version_num;

-- Running upgrade 20261009_0001 -> 20261009_0002

CREATE INDEX ix_schemes_status_state_code_category ON schemes (status, state_code, category);

CREATE INDEX ix_scheme_versions_scheme_id_review_status_published_at ON scheme_versions (scheme_id, review_status, published_at);

CREATE INDEX ix_eligibility_rules_scheme_version_id ON eligibility_rules (scheme_version_id);

CREATE INDEX ix_profile_sessions_expires_at ON profile_sessions (expires_at);

UPDATE alembic_version SET version_num='20261009_0002' WHERE alembic_version.version_num = '20261009_0001';

-- Running upgrade 20261009_0002 -> 20261009_0003

CREATE FUNCTION reject_published_version_mutation()
        RETURNS trigger AS $$
        BEGIN
            IF OLD.published_at IS NOT NULL THEN
                RAISE EXCEPTION 'published scheme version % is immutable', OLD.id
                    USING ERRCODE = '55000';
            END IF;
            IF TG_OP = 'DELETE' THEN
                RETURN OLD;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;;

CREATE TRIGGER trg_scheme_versions_immutable
        BEFORE UPDATE OR DELETE ON scheme_versions
        FOR EACH ROW EXECUTE FUNCTION reject_published_version_mutation();;

CREATE FUNCTION reject_published_version_child_mutation()
        RETURNS trigger AS $$
        DECLARE
            old_version uuid;
            new_version uuid;
        BEGIN
            IF TG_OP <> 'INSERT' THEN
                old_version := OLD.scheme_version_id;
            END IF;
            IF TG_OP <> 'DELETE' THEN
                new_version := NEW.scheme_version_id;
            END IF;
            IF EXISTS (
                SELECT 1
                FROM scheme_versions
                WHERE id IN (old_version, new_version)
                  AND published_at IS NOT NULL
            ) THEN
                RAISE EXCEPTION 'records of a published scheme version are immutable'
                    USING ERRCODE = '55000';
            END IF;
            IF TG_OP = 'DELETE' THEN
                RETURN OLD;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;;

CREATE TRIGGER trg_sources_published_version_immutable
            BEFORE INSERT OR UPDATE OR DELETE ON sources
            FOR EACH ROW EXECUTE FUNCTION reject_published_version_child_mutation();;

CREATE TRIGGER trg_eligibility_rules_published_version_immutable
            BEFORE INSERT OR UPDATE OR DELETE ON eligibility_rules
            FOR EACH ROW EXECUTE FUNCTION reject_published_version_child_mutation();;

CREATE TRIGGER trg_required_documents_published_version_immutable
            BEFORE INSERT OR UPDATE OR DELETE ON required_documents
            FOR EACH ROW EXECUTE FUNCTION reject_published_version_child_mutation();;

CREATE TRIGGER trg_application_steps_published_version_immutable
            BEFORE INSERT OR UPDATE OR DELETE ON application_steps
            FOR EACH ROW EXECUTE FUNCTION reject_published_version_child_mutation();;

UPDATE alembic_version SET version_num='20261009_0003' WHERE alembic_version.version_num = '20261009_0002';

-- Running upgrade 20261009_0003 -> 20261009_0004

ALTER TABLE "schemes" ENABLE ROW LEVEL SECURITY;;

ALTER TABLE "scheme_versions" ENABLE ROW LEVEL SECURITY;;

ALTER TABLE "sources" ENABLE ROW LEVEL SECURITY;;

ALTER TABLE "eligibility_rules" ENABLE ROW LEVEL SECURITY;;

ALTER TABLE "required_documents" ENABLE ROW LEVEL SECURITY;;

ALTER TABLE "application_steps" ENABLE ROW LEVEL SECURITY;;

ALTER TABLE "profile_sessions" ENABLE ROW LEVEL SECURITY;;

ALTER TABLE "profile_facts" ENABLE ROW LEVEL SECURITY;;

ALTER TABLE "match_runs" ENABLE ROW LEVEL SECURITY;;

ALTER TABLE "match_results" ENABLE ROW LEVEL SECURITY;;

ALTER TABLE "saved_schemes" ENABLE ROW LEVEL SECURITY;;

ALTER TABLE "admin_audit_log" ENABLE ROW LEVEL SECURITY;;

UPDATE alembic_version SET version_num='20261009_0004' WHERE alembic_version.version_num = '20261009_0003';

-- Running upgrade 20261009_0004 -> 20261009_0005

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE staging_schemes (
    id UUID NOT NULL,
    slug VARCHAR(255) NOT NULL,
    name TEXT NOT NULL,
    record JSONB NOT NULL,
    missing_fields JSONB NOT NULL,
    input_sha256 VARCHAR(64) NOT NULL,
    embedding VECTOR(768) NOT NULL,
    imported_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_staging_schemes PRIMARY KEY (id),
    CONSTRAINT uq_staging_schemes_slug UNIQUE (slug)
);

ALTER TABLE "staging_schemes" ENABLE ROW LEVEL SECURITY;;

UPDATE alembic_version SET version_num='20261009_0005' WHERE alembic_version.version_num = '20261009_0004';

COMMIT;
