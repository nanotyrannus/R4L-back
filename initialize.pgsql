CREATE TYPE damage_level AS ENUM ('damage', 'no_damage', 'unsure', 'not_evaluated');

CREATE TABLE app_user(
    first_name      TEXT                            NOT NULL,
    last_name       TEXT                            NOT NULL,
    username        TEXT                            NOT NULL,
    email           TEXT                            NOT NULL,
    hash            TEXT                            NOT NULL,
    salt            TEXT                            NOT NULL,
    is_admin        BOOLEAN                         DEFAULT FALSE
);

CREATE TABLE event(
    id              SERIAL,
    name            TEXT                            NOT NULL,
    description     TEXT,
    thumbnail       TEXT,
    creation_date   DATE,
    centroid        GEOMETRY(POINT, 4326),
    site_count      INTEGER,
    bbox            GEOMETRY(POLYGON, 4326)       
);

CREATE TABLE site(
    event_id        INTEGER                         REFERENCES event(id),
    polygon_id      INTEGER                         NOT NULL,
    id              SERIAL                          NOT NULL
); 

CREATE TABLE site_vote(
    username        TEXT                            REFERENCES app_user(username),
    site_id         INTEGER                         REFERENCES site(id),
    vote            ENUM                            DEFAULT 'not_evaluated'
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
    