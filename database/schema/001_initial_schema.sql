CREATE TABLE source_snapshots (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    base_url TEXT,
    captured_at TIMESTAMPTZ,
    verified_status TEXT NOT NULL,
    patch_version TEXT
);

CREATE TABLE maps (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    source_snapshot_id BIGINT REFERENCES source_snapshots(id)
);

CREATE TABLE items (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    type_id INTEGER NOT NULL,
    type_label TEXT,
    sell INTEGER,
    process INTEGER,
    process_amount INTEGER,
    badge TEXT,
    note TEXT,
    source_snapshot_id BIGINT REFERENCES source_snapshots(id)
);

CREATE TABLE monsters (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    level INTEGER,
    map_id INTEGER REFERENCES maps(id),
    map_name TEXT,
    type_code TEXT,
    type_label TEXT,
    mode TEXT,
    hp INTEGER,
    exp INTEGER,
    element_id INTEGER,
    element_label TEXT,
    tameable BOOLEAN,
    limited BOOLEAN,
    badge TEXT,
    note TEXT,
    source_snapshot_id BIGINT REFERENCES source_snapshots(id)
);

CREATE TABLE npcs (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    source_snapshot_id BIGINT REFERENCES source_snapshots(id)
);

CREATE TABLE quests (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    level_required INTEGER,
    exp_reward INTEGER,
    npc_id INTEGER REFERENCES npcs(id),
    npc_name TEXT,
    source_snapshot_id BIGINT REFERENCES source_snapshots(id)
);

CREATE TABLE quest_objectives (
    id TEXT PRIMARY KEY,
    quest_id INTEGER NOT NULL REFERENCES quests(id),
    objective_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    target_item_id INTEGER REFERENCES items(id),
    target_item_name TEXT,
    source_snapshot_id BIGINT REFERENCES source_snapshots(id)
);

CREATE TABLE data_quality_issues (
    id BIGSERIAL PRIMARY KEY,
    entity TEXT NOT NULL,
    source_file TEXT NOT NULL,
    source_record_index INTEGER,
    record_id TEXT,
    severity TEXT NOT NULL,
    error_code TEXT NOT NULL,
    message TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_items_name ON items(name);
CREATE INDEX idx_monsters_level ON monsters(level);
CREATE INDEX idx_monsters_map_id ON monsters(map_id);
CREATE INDEX idx_quests_level_required ON quests(level_required);
CREATE INDEX idx_quest_objectives_target_item_id ON quest_objectives(target_item_id);

