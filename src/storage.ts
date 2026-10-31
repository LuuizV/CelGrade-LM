import { DatabaseSync } from 'node:sqlite';
import { DB, empty, normalizeRooms, validate } from './core';
export class Store {
    private sql: DatabaseSync;
    constructor(file: string) { this.sql = new DatabaseSync(file); this.sql.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000; CREATE TABLE IF NOT EXISTS state(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS preferences(key TEXT PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS recovery(id INTEGER PRIMARY KEY AUTOINCREMENT,created TEXT NOT NULL,reason TEXT NOT NULL,data TEXT NOT NULL);`); this.sql.prepare('INSERT OR IGNORE INTO state VALUES(1,?)').run(JSON.stringify(empty())); validate(this.read()); }
    read(): DB { return normalizeRooms(JSON.parse((this.sql.prepare('SELECT data FROM state WHERE id=1').get() as {
        data: string;
    }).data)); }
    save(input: DB, reason = 'Alteração'): DB {
        validate(input);
        const next = structuredClone(input);
        if (Buffer.byteLength(JSON.stringify(next), 'utf8') > 10000000)
            throw Error('Banco acima de 10 MB. Exporte e remova alternativas antigas antes de continuar.');
        this.sql.exec('BEGIN IMMEDIATE');
        try {
            const old = this.read();
            if (old.revision !== next.revision)
                throw Error('Dados atualizados por outra operação. Reabra a tela antes de tentar novamente.');
            this.sql.prepare('INSERT INTO recovery(created,reason,data) VALUES(?,?,?)').run(new Date().toISOString(), reason.slice(0, 200), JSON.stringify(old));
            next.revision = old.revision + 1;
            this.sql.prepare('UPDATE state SET data=? WHERE id=1').run(JSON.stringify(next));
            this.sql.exec('DELETE FROM recovery WHERE id NOT IN (SELECT id FROM recovery ORDER BY id DESC LIMIT 30); COMMIT');
            return next;
        }
        catch (e) {
            this.sql.exec('ROLLBACK');
            throw e;
        }
    }
    history() { return this.sql.prepare('SELECT id,created,reason FROM recovery ORDER BY id DESC').all(); }
    restore(id: number, revision: number): DB { if (!Number.isSafeInteger(id))
        throw Error('Ponto de recuperação inválido.'); const row = this.sql.prepare('SELECT data FROM recovery WHERE id=?').get(id) as {
        data: string;
    } | undefined; if (!row)
        throw Error('Ponto de recuperação não encontrado.'); const d = JSON.parse(row.data); d.revision = revision; return this.save(d, 'Antes de restaurar histórico'); }
    seenRelease(): string | null { return (this.sql.prepare("SELECT value FROM preferences WHERE key='seen-release'").get() as {value:string} | undefined)?.value ?? null; }
    markReleaseSeen(version: string) { if (!/^\d+\.\d+\.\d+$/.test(version)) throw Error('Versão inválida.'); const previous = this.seenRelease(); if (previous && /^\d+\.\d+\.\d+$/.test(previous)) { const a = previous.split('.').map(Number), b = version.split('.').map(Number); for (let i=0;i<3;i++) { if (a[i] > b[i]) return; if (a[i] < b[i]) break; } } this.sql.prepare("INSERT INTO preferences(key,value) VALUES('seen-release',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(version); }
    close() { this.sql.close(); }
}
