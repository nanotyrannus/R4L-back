-- CREATE TYPE damage_level AS ENUM ('damage', 'no_damage', 'unsure', 'not_evaluated');

CREATE TABLE IF NOT EXISTS app_user(
    first_name      TEXT                            NOT NULL,
    last_name       TEXT                            NOT NULL,
    username        TEXT                            NOT NULL UNIQUE,
    email           TEXT                            NOT NULL UNIQUE,
    hash            TEXT                            NOT NULL,
    salt            TEXT                            NOT NULL,
    id                                              SERIAL UNIQUE,
    is_admin        BOOLEAN                         DEFAULT FALSE,
    weight          FLOAT8                          DEFAULT 1.0
);

CREATE TABLE IF NOT EXISTS event(
    id                                              SERIAL UNIQUE,
    name            TEXT                            NOT NULL,
    description     TEXT,
    thumbnail       TEXT,
    creation_date   DATE,
    start_date      DATE,
    end_date        DATE,
    site_count      INTEGER,
    centroid        GEOMETRY(POINT, 4326),
    bbox            GEOMETRY(POLYGON, 4326)       
);

CREATE TABLE IF NOT EXISTS site(
    event_id        INTEGER                         REFERENCES event(id),
    polygon_id      INTEGER                         NOT NULL,
    polygon         GEOMETRY(POLYGON, 4326)         NOT NULL,
    bbox            GEOMETRY(POLYGON, 4326),
    centroid        GEOMETRY(POINT, 4326),
    properties      JSONB,
    id              SERIAL                          NOT NULL UNIQUE
); 

CREATE TABLE IF NOT EXISTS site_vote(
    user_id         INTEGER                         REFERENCES app_user(id),
    site_id         INTEGER                         REFERENCES site(id),
    vote            damage_level                    DEFAULT 'not_evaluated',
    weight          FLOAT8                          NOT NULL,
    vote_time       TIMESTAMP                       DEFAULT NOW(),
    PRIMARY KEY (user_id, site_id)
);

-- CREATE OR REPLACE FUNCTION drop_tables_by_wildcard(IN _schema TEXT, IN _parttionbase TEXT) 
-- RETURNS void 
-- LANGUAGE plpgsql
-- AS
-- $$
-- DECLARE
--     row     record;
-- BEGIN
--     FOR row IN 
--         SELECT
--             table_schema,
--             table_name
--         FROM
--             information_schema.tables
--         WHERE
--             table_type = 'BASE TABLE'
--         AND
--             table_schema = _schema
--         AND
--             table_name ILIKE (_parttionbase || '%')
--     LOOP
--         EXECUTE 'DROP TABLE ' || quote_ident(row.table_schema) || '.' || quote_ident(row.table_name);
--         RAISE INFO 'Dropped table: %', quote_ident(row.table_schema) || '.' || quote_ident(row.table_name);
--     END LOOP;
-- END;
-- $$;

-- CREATE OR REPLACE FUNCTION delete_all_events()
-- RETURNS void
-- LANGUAGE plpgsql
-- AS
-- $$
-- BEGIN
--     PERFORM drop_tables_by_wildcard('public', '\_%\_sites');
--     PERFORM drop_tables_by_wildcard('public', '\_%\_states');
--     DELETE FROM events;
-- END;
-- $$;
    