# Runs the exact SQL used in SqliteStore.java against real SQLite (Python's sqlite3).
import sqlite3, re
src = open(__import__('os').path.join(__import__('os').path.dirname(__file__), '..', 'src', 'SqliteStore.java')).read()
db = sqlite3.connect(':memory:')
ok = fail = 0
def check(name, cond):
    global ok, fail
    ok += cond; fail += (not cond); print(('PASS  ' if cond else 'FAIL  ') + name)

db.execute("CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, barcode TEXT NOT NULL UNIQUE, stock INTEGER NOT NULL CHECK (stock >= 0), unit TEXT NOT NULL, reorder INTEGER NOT NULL CHECK (reorder >= 0), pack_label TEXT NOT NULL, pack_qty INTEGER NOT NULL CHECK (pack_qty >= 1), expiry TEXT NOT NULL)")
db.execute("CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT NOT NULL)")
# confirm the statements used here are really the ones in the Java file
for frag in ["UPDATE products SET stock = MAX(0, stock + ?) WHERE id = ?", "INSERT OR REPLACE INTO settings (k, v) VALUES ('code_template', ?)",
             "name TEXT NOT NULL UNIQUE COLLATE NOCASE", "CHECK (stock >= 0)", "ESCAPE '\\\\'"]:
    check("SQL text present in SqliteStore.java: " + frag[:45], frag in src)

row = ('GRC-0001','Basmati Rice 5kg','8901',42,'bag',10,'case',6,'2026-12-01')
ins = "INSERT INTO products (id, name, barcode, stock, unit, reorder, pack_label, pack_qty, expiry) VALUES (?,?,?,?,?,?,?,?,?)"
db.execute(ins, row)
db.execute(ins, ('GRC-0002','Fresh Tofu 300g','8850',15,'pack',6,'tray',8,'2026-09-02'))

def raises(sql, args):
    try: db.execute(sql, args); return False
    except sqlite3.IntegrityError as e: return 'UNIQUE' in str(e) or 'CHECK' in str(e)

check("duplicate code rejected (UNIQUE)", raises(ins, ('GRC-0001','Other','1',1,'u',1,'b',1,'2027-01-01')))
check("duplicate name rejected ignoring case (FR-01)", raises(ins, ('GRC-0009','BASMATI rice 5KG','2',1,'u',1,'b',1,'2027-01-01')))
check("duplicate barcode rejected", raises(ins, ('GRC-0010','New','8901',1,'u',1,'b',1,'2027-01-01')))
check("negative stock rejected by CHECK (D-05)", raises(ins, ('GRC-0011','Neg','3',-5,'u',1,'b',1,'2027-01-01')))
check("pack_qty 0 rejected by CHECK", raises(ins, ('GRC-0012','Pack','4',1,'u',1,'b',0,'2027-01-01')))
check("name lookup ignores case", db.execute("SELECT id FROM products WHERE name = ?", ('fresh TOFU 300g',)).fetchone()[0] == 'GRC-0002')

q = "UPDATE products SET stock = MAX(0, stock + ?) WHERE id = ?"
db.execute(q, (-1, 'GRC-0001')); check("stock -1 reduces by 1", db.execute("SELECT stock FROM products WHERE id='GRC-0001'").fetchone()[0] == 41)
db.execute(q, (6, 'GRC-0001'));  check("restock +6 adds 6", db.execute("SELECT stock FROM products WHERE id='GRC-0001'").fetchone()[0] == 47)
db.execute(q, (-500, 'GRC-0002')); check("big negative change clamps at 0", db.execute("SELECT stock FROM products WHERE id='GRC-0002'").fetchone()[0] == 0)
check("unknown id updates 0 rows (-> 404)", db.execute(q, (1, 'GRC-9999')).rowcount == 0)

like = "SELECT id FROM products WHERE name LIKE ? ESCAPE '\\' OR id LIKE ? ESCAPE '\\' ORDER BY id"
check("search 'tofu' finds 1 (case-insensitive)", len(db.execute(like, ('%tofu%','%tofu%')).fetchall()) == 1)
check("search by code finds 1", len(db.execute(like, ('%GRC-0002%','%GRC-0002%')).fetchall()) == 1)
check("search 'zzz' finds none", db.execute(like, ('%zzz%','%zzz%')).fetchall() == [])
check("search '%' is escaped, so matches nothing", db.execute(like, ('%\\%%','%\\%%')).fetchall() == [])

st = "INSERT OR REPLACE INTO settings (k, v) VALUES ('code_template', ?)"
db.execute(st, ('^A$',)); db.execute(st, ('^B$',))
check("template saved and replaced (one row)", db.execute("SELECT v FROM settings WHERE k='code_template'").fetchall() == [('^B$',)])
print(f"\n{ok}/{ok+fail} SQL checks passed")
