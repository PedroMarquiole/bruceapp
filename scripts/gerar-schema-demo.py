"""Gera src/demo/schema.ts a partir das migrations: colunas de cada tabela com seus padrões.
Rodar de novo ao mudar o esquema: python3 scripts/gerar-schema-demo.py"""
import json, re, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
sql = '\n'.join(p.read_text() for p in sorted((root / 'supabase/migrations').glob('*.sql')))
tables = {}
for m in re.finditer(r'create table public\.(\w+) \((.*?)\n\);', sql, re.S):
    name, body = m.group(1), m.group(2)
    cols = {}
    for line in body.split('\n'):
        line = line.strip().rstrip(',')
        cm = re.match(r'([a-z_0-9]+) (uuid|text|smallint\[\]|smallint|integer|numeric\([^)]*\)|numeric|boolean|date|timestamptz|time|jsonb|text\[\])(?=\s|$)(.*)', line)
        if not cm or cm.group(1) in ('check', 'unique', 'primary', 'foreign', 'constraint'):
            continue
        col, typ, rest = cm.groups()
        d = re.search(r"default ('(?:[^']|'')*'(?:::\w+)?|[\w.()]+)", rest)
        val = None
        if d:
            raw = d.group(1)
            if raw.startswith("'"):
                s = raw.split("'::")[0].strip("'")
                if typ.endswith('[]'):
                    inner = s.strip('{}')
                    items = [x for x in inner.split(',') if x]
                    val = [int(x) for x in items] if typ.startswith('smallint') else items
                elif typ == 'jsonb':
                    val = json.loads(s)
                else:
                    val = s
            elif raw in ('true', 'false'):
                val = raw == 'true'
            elif re.fullmatch(r'-?\d+(\.\d+)?', raw):
                val = float(raw) if '.' in raw else int(raw)
            elif raw in ('now()',):
                val = '$now'
            elif raw == 'current_date':
                val = '$today'
            elif raw == 'gen_random_uuid()':
                val = '$uuid'
            elif raw == 'auth.uid()':
                val = '$uid'
        cols[col] = val
    tables[name] = cols

exercises = []
for name, prim, sec, equip, instr in re.findall(
    r"\(null, '((?:[^']|'')*)', '\{([^}]*)\}', '\{([^}]*)\}', '([^']*)', '((?:[^']|'')*)'\)", sql
):
    exercises.append({
        'name': name.replace("''", "'"),
        'primary_muscles': [x for x in prim.split(',') if x],
        'secondary_muscles': [x for x in sec.split(',') if x],
        'equipment': equip,
        'instructions': instr.replace("''", "'"),
    })

out = root / 'src/demo/schema.ts'
out.parent.mkdir(exist_ok=True)
out.write_text(
    '// Gerado por scripts/gerar-schema-demo.py a partir de supabase/migrations. Não edite à mão.\n'
    '// Valores especiais: $uuid, $uid, $now, $today.\n'
    'export const SCHEMA: Record<string, Record<string, unknown>> = '
    + json.dumps(tables, ensure_ascii=False, indent=2)
    + '\n\n// Catálogo global de exercícios (o mesmo da migration).\n'
    + 'export const EXERCISES = '
    + json.dumps(exercises, ensure_ascii=False, indent=2)
    + '\n'
)
print(len(tables), 'tabelas,', len(exercises), 'exercícios')
