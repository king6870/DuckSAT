import os
import json
import base64
import uuid
from datetime import datetime

# --- USER: Fill these with your generated question data ---
question_data = {
    "question": "<SAT math question text>",
    "choices": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "diagram_base64": "<base64 PNG string>",
}

# --- Build ODBC connection string for Azure SQL ---
raw_conn_str = os.getenv('DATABASE_URL')
conn_str = None
if raw_conn_str:
    import re
    m = re.match(r'sqlserver://([^:]+):([^@]+)@([^:/]+)(?::(\\d+))?/(\\w+)(\\?.*)?', raw_conn_str)
    if m:
        user, pwd, host, port, db, _ = m.groups()
        port = port or '1433'
        conn_str = f"DRIVER={{SQL Server}};SERVER={host},{port};DATABASE={db};UID={user};PWD={pwd};"
    else:
        conn_str = raw_conn_str
else:
    raise Exception("DATABASE_URL not set in environment")

# --- Prepare data for insertion ---
options_json = json.dumps(question_data['choices'])
tags_json = json.dumps(["SAT", "math", "generated"])
image_bytes = base64.b64decode(question_data['diagram_base64']) if question_data.get('diagram_base64') else None
image_mime = 'image/png' if image_bytes else None

gen_id = str(uuid.uuid4())
now = datetime.utcnow()
values = [
    gen_id,
    'math',
    'medium',
    'geometry',
    None,
    'geometry',
    question_data['question'],
    options_json,
    0,
    'Auto-generated SAT question',
    image_bytes,
    image_mime,
    90,
    tags_json,
    True,
    now,
    now
]

insert_sql = '''
INSERT INTO questions (
    id, moduleType, difficulty, category, subtopic, visualType, question, options, correctAnswer, explanation,
    imageData, imageMimeType, timeEstimate, tags, isActive, createdAt, updatedAt
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
'''

try:
    import pyodbc
    with pyodbc.connect(conn_str) as conn:
        with conn.cursor() as cur:
            cur.execute(insert_sql, values)
            conn.commit()
    print(f"✓ Question inserted into database with id: {gen_id}")
except Exception as e:
    print(f"⚠️ Database insert failed: {e}")
