"""
DuckSAT Diagram Question Generator
===================================
Generates SAT questions with matplotlib diagrams and imports them into Azure SQL.

Flow:
  1. Azure OpenAI generates question JSON with diagram_description
  2. Azure OpenAI generates matplotlib code from the description
  3. matplotlib renders the code to PNG (base64)
  4. Question + image saved to JSON batch file
  5. Separate import step pushes to DB

Usage:
  python scripts/generate_diagram_questions.py --type geometry --count 20
  python scripts/generate_diagram_questions.py --type bar-chart --count 20
  python scripts/generate_diagram_questions.py --type scatter-plot --count 20
  python scripts/generate_diagram_questions.py --type function-graph --count 20
  python scripts/generate_diagram_questions.py --type all --count 100
  python scripts/generate_diagram_questions.py --import-batch <batch_file.json>
  python scripts/generate_diagram_questions.py --import-all

Diagram types:
  geometry        - triangles, circles, angles, coordinate geometry
  bar-chart       - bar/column charts for data analysis
  scatter-plot    - scatter plots with trend lines
  function-graph  - parabolas, linear functions, exponentials
  line-graph      - line graphs showing trends over time
  pie-chart       - pie/circle charts for proportions
"""

import json
import base64
import os
import sys
import time
import glob
import argparse
import traceback
from io import BytesIO
from datetime import datetime, timezone
from pathlib import Path

import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import numpy as np

from openai import AzureOpenAI
from dotenv import load_dotenv

# ─── Configuration ───────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
OUTPUT_DIR = PROJECT_DIR / "generated-batches" / "diagram-batches"
APPROVED_DIR = PROJECT_DIR / "generated-batches" / "approved"

# Load env
for envfile in [PROJECT_DIR / ".env.local", PROJECT_DIR / ".env"]:
    if envfile.exists():
        load_dotenv(envfile)
        break

# Azure OpenAI client
client = AzureOpenAI(
    api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
    azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT", ""),
    api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-12-01-preview"),
    timeout=90.0,
    max_retries=0,  # We handle retries ourselves
)
DEPLOYMENT = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-5-nano")

# ─── Diagram Type Configs ────────────────────────────────────────────────────

DIAGRAM_CONFIGS = {
    "geometry": {
        "category": "geometry",
        "moduleType": "math",
        "visualType": "geometry",
        "subtopics": [
            "triangles", "circles", "coordinate-geometry",
            "angles", "area-perimeter", "transformations"
        ],
        "system_prompt": """You are an expert SAT math question writer specializing in geometry with diagrams.
ALL math must use LaTeX notation wrapped in dollar signs: $\\triangle ABC$, $\\angle A = 90°$, $x^2$.
You MUST provide a detailed diagram_description for matplotlib rendering.""",
        "user_template": """Create a single SAT geometry question that REQUIRES a diagram to solve.
DIFFICULTY: {difficulty}
SUBTOPIC: {subtopic}

The question MUST involve a VISUAL geometric figure (triangle, circle, angle, coordinate plane, etc.)
that students need to reference to answer the question.

Return ONLY a JSON object:
{{
  "question": "SAT-style question referencing the diagram (use LaTeX $ for math)",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correctAnswer": 0-3,
  "explanation": "step-by-step solution referencing the diagram",
  "wrongAnswerExplanations": {{"A": "why wrong", "B": "why wrong", "C": "why wrong", "D": "why wrong"}},
  "difficulty": "{difficulty}",
  "subtopic": "{subtopic}",
  "diagram_description": "DETAILED description for matplotlib: exact coordinates, labels, measurements, angles. Example: 'Right triangle with vertices A(0,0), B(6,0), C(0,8). Label sides: AB=6, AC=8, BC=10. Show right angle marker at A. Label angle B as theta.'"
}}"""
    },
    "bar-chart": {
        "category": "problem-solving-data-analysis",
        "moduleType": "math",
        "visualType": "bar-chart",
        "subtopics": [
            "reading-bar-charts", "comparing-categories",
            "calculating-differences", "percentages-from-charts"
        ],
        "system_prompt": """You are an expert SAT math question writer specializing in data analysis with bar charts.
Create questions where students must read and interpret bar chart data.
ALL math must use LaTeX $ delimiters.""",
        "user_template": """Create a single SAT data analysis question based on a BAR CHART.
DIFFICULTY: {difficulty}
SUBTOPIC: {subtopic}

The question MUST require reading specific values from a bar chart.

Return ONLY a JSON object:
{{
  "question": "SAT-style question about the bar chart data",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correctAnswer": 0-3,
  "explanation": "solution referencing specific bars/values",
  "wrongAnswerExplanations": {{"A": "why wrong", "B": "why wrong", "C": "why wrong", "D": "why wrong"}},
  "difficulty": "{difficulty}",
  "subtopic": "{subtopic}",
  "diagram_description": "DETAILED bar chart spec: 'Bar chart with title \"Monthly Sales Revenue\". X-axis categories: Jan, Feb, Mar, Apr, May, Jun. Y-axis: Revenue ($K). Values: Jan=45, Feb=52, Mar=38, Apr=61, May=55, Jun=70. Color: steel blue. Grid on y-axis.'"
}}"""
    },
    "scatter-plot": {
        "category": "problem-solving-data-analysis",
        "moduleType": "math",
        "visualType": "scatter-plot",
        "subtopics": [
            "trend-lines", "correlation",
            "predictions", "outliers"
        ],
        "system_prompt": """You are an expert SAT math question writer specializing in data analysis with scatter plots.
Create questions about correlation, trend lines, and data interpretation.
ALL math must use LaTeX $ delimiters.""",
        "user_template": """Create a single SAT data analysis question based on a SCATTER PLOT.
DIFFICULTY: {difficulty}
SUBTOPIC: {subtopic}

The question MUST require interpreting a scatter plot (trend, correlation, prediction, outlier).

Return ONLY a JSON object:
{{
  "question": "SAT-style question about the scatter plot",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correctAnswer": 0-3,
  "explanation": "solution referencing the scatter plot data",
  "wrongAnswerExplanations": {{"A": "why wrong", "B": "why wrong", "C": "why wrong", "D": "why wrong"}},
  "difficulty": "{difficulty}",
  "subtopic": "{subtopic}",
  "diagram_description": "DETAILED scatter plot spec: 'Scatter plot titled \"Study Hours vs Test Score\". X-axis: Hours Studied (0-10). Y-axis: Test Score (50-100). Points: (1,55), (2,60), (3,65), (4,68), (5,75), (6,78), (7,82), (8,85), (9,90), (10,95). Best-fit line: y = 4.5x + 50. Show the trend line as dashed red.'"
}}"""
    },
    "function-graph": {
        "category": "advanced-math",
        "moduleType": "math",
        "visualType": "function-graph",
        "subtopics": [
            "parabolas", "linear-functions",
            "exponential-functions", "absolute-value"
        ],
        "system_prompt": """You are an expert SAT math question writer specializing in function graphs.
Create questions where students analyze graphs of functions (parabolas, linear, exponential).
ALL math must use LaTeX $ delimiters.""",
        "user_template": """Create a single SAT advanced math question based on a FUNCTION GRAPH.
DIFFICULTY: {difficulty}
SUBTOPIC: {subtopic}

The question MUST require analyzing a graph of a mathematical function.

Return ONLY a JSON object:
{{
  "question": "SAT-style question about the function graph (use LaTeX)",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correctAnswer": 0-3,
  "explanation": "solution referencing the graph",
  "wrongAnswerExplanations": {{"A": "why wrong", "B": "why wrong", "C": "why wrong", "D": "why wrong"}},
  "difficulty": "{difficulty}",
  "subtopic": "{subtopic}",
  "diagram_description": "DETAILED function graph spec: 'Graph of f(x) = x^2 - 4x + 3 on domain [-1, 5]. Show vertex at (2, -1). X-intercepts at x=1 and x=3. Y-intercept at (0,3). Label vertex and intercepts. Axes with grid lines. Title: y = f(x).'"
}}"""
    },
    "line-graph": {
        "category": "problem-solving-data-analysis",
        "moduleType": "math",
        "visualType": "line-graph",
        "subtopics": [
            "reading-trends", "rate-of-change",
            "comparing-lines", "predictions"
        ],
        "system_prompt": """You are an expert SAT math question writer specializing in line graphs.
Create questions about trends, rates of change, and data interpretation from line graphs.
ALL math must use LaTeX $ delimiters.""",
        "user_template": """Create a single SAT data analysis question based on a LINE GRAPH.
DIFFICULTY: {difficulty}
SUBTOPIC: {subtopic}

The question MUST require reading and interpreting a line graph.

Return ONLY a JSON object:
{{
  "question": "SAT-style question about the line graph",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correctAnswer": 0-3,
  "explanation": "solution referencing the line graph",
  "wrongAnswerExplanations": {{"A": "why wrong", "B": "why wrong", "C": "why wrong", "D": "why wrong"}},
  "difficulty": "{difficulty}",
  "subtopic": "{subtopic}",
  "diagram_description": "DETAILED line graph spec: 'Line graph titled \"Population Growth\". X-axis: Year (2018-2024). Y-axis: Population (thousands). Data points connected by line: 2018=120, 2019=125, 2020=118, 2021=130, 2022=142, 2023=155, 2024=162. Blue line with circular markers. Grid on both axes.'"
}}"""
    },
    "pie-chart": {
        "category": "problem-solving-data-analysis",
        "moduleType": "math",
        "visualType": "pie-chart",
        "subtopics": [
            "reading-proportions", "calculating-percentages",
            "comparing-sectors", "degrees-in-sectors"
        ],
        "system_prompt": """You are an expert SAT math question writer specializing in pie charts.
Create questions about proportions, percentages, and sector calculations.
ALL math must use LaTeX $ delimiters.""",
        "user_template": """Create a single SAT data analysis question based on a PIE CHART.
DIFFICULTY: {difficulty}
SUBTOPIC: {subtopic}

The question MUST require interpreting a pie chart.

Return ONLY a JSON object:
{{
  "question": "SAT-style question about the pie chart",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correctAnswer": 0-3,
  "explanation": "solution referencing the pie chart sectors",
  "wrongAnswerExplanations": {{"A": "why wrong", "B": "why wrong", "C": "why wrong", "D": "why wrong"}},
  "difficulty": "{difficulty}",
  "subtopic": "{subtopic}",
  "diagram_description": "DETAILED pie chart spec: 'Pie chart titled \"Budget Allocation\". Sectors: Housing 35%, Food 20%, Transportation 15%, Entertainment 10%, Savings 12%, Other 8%. Colors: distinct for each. Show percentage labels on each sector. Total budget: $4,000 per month.'"
}}"""
    },
}

DIFFICULTY_DISTRIBUTION = {"easy": 0.30, "medium": 0.50, "hard": 0.20}

# Distribution for "all" mode to reach ~25% of total DB
# Current DB: ~5467 questions, 22 with diagrams
# Target: 25% → ~1367 with diagrams → need ~1345 more
# We'll generate in batches across types
ALL_TYPE_DISTRIBUTION = {
    "geometry": 0.35,        # ~470 questions
    "bar-chart": 0.15,       # ~200
    "scatter-plot": 0.12,    # ~160
    "function-graph": 0.18,  # ~240
    "line-graph": 0.12,      # ~160
    "pie-chart": 0.08,       # ~110
}

# ─── Matplotlib Code Generation ──────────────────────────────────────────────

MATPLOTLIB_SYSTEM = """You are an expert matplotlib programmer. Generate COMPLETE, SELF-CONTAINED Python code that:
1. Creates a matplotlib figure using plt.subplots()
2. Draws the described diagram with EXACT values, labels, and annotations
3. Saves to a BytesIO buffer variable named exactly `buffer`
4. Closes the figure with plt.close()

CRITICAL RULES:
- The code MUST define a variable called `buffer` (BytesIO)
- Use `plt.savefig(buffer, format='png', bbox_inches='tight', dpi=150, facecolor='white')`
- Use `plt.close()` at the end
- DO NOT call plt.show()
- Import NOTHING - assume matplotlib.pyplot as plt, numpy as np, BytesIO are available
- Use figsize=(8, 6) for charts, (8, 8) for geometry
- Use clear, large fonts (fontsize=12+)
- For geometry: use ax.set_aspect('equal')
- For charts: include title, axis labels, grid where appropriate
- Make diagrams clean, professional, and easy to read
- Label ALL important points, lines, and values mentioned in the description

Return ONLY a JSON object: {"code": "complete python code as a single string"}"""

def generate_matplotlib_code(diagram_desc: str, question_text: str) -> str | None:
    """Ask OpenAI to generate matplotlib code for the diagram."""
    try:
        resp = client.chat.completions.create(
            model=DEPLOYMENT,
            messages=[
                {"role": "system", "content": MATPLOTLIB_SYSTEM},
                {"role": "user", "content": f"Create matplotlib code for this diagram:\n\n{diagram_desc}\n\nThis is for the question: {question_text}"}
            ],
            response_format={"type": "json_object"},
        )
        data = json.loads(resp.choices[0].message.content)
        return data.get("code")
    except Exception as e:
        print(f"  ⚠ Error generating matplotlib code: {e}")
        return None


def render_matplotlib(code: str, diagram_desc: str) -> str | None:
    """Execute matplotlib code and return base64 PNG, or None on failure."""
    if not code:
        return None
    
    # Safety: comment out plt.show() and any input() calls
    safe_code = '\n'.join(
        f'# {line}' if any(bad in line for bad in ['plt.show', 'input(', 'os.system', 'subprocess', 'exec(', 'eval(']) else line
        for line in code.splitlines()
    )
    
    exec_globals = {
        'BytesIO': BytesIO,
        'plt': plt,
        'np': np,
        'matplotlib': matplotlib,
    }
    
    try:
        exec(safe_code, exec_globals)
        
        # Find the buffer
        if 'buffer' in exec_globals and isinstance(exec_globals['buffer'], BytesIO):
            buf = exec_globals['buffer']
        else:
            # Search for any BytesIO object
            buf = None
            for v in exec_globals.values():
                if isinstance(v, BytesIO):
                    buf = v
                    break
        
        if buf is None:
            raise ValueError("No BytesIO buffer found in generated code")
        
        buf.seek(0)
        data = buf.getvalue()
        if len(data) < 100:
            raise ValueError("Generated image too small, likely empty")
        
        return base64.b64encode(data).decode('ascii')
        
    except Exception as e:
        print(f"  ⚠ Matplotlib render failed: {e}")
        # Fallback: generate a simple placeholder
        return render_fallback_diagram(diagram_desc)
    finally:
        plt.close('all')


def render_fallback_diagram(desc: str) -> str | None:
    """Generate a simple text-based fallback diagram."""
    try:
        fig, ax = plt.subplots(figsize=(8, 6))
        ax.text(0.5, 0.5, f"Diagram:\n\n{desc[:200]}", 
                ha='center', va='center', wrap=True, fontsize=11,
                bbox=dict(boxstyle='round,pad=0.8', facecolor='lightyellow', alpha=0.8))
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.axis('off')
        buf = BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', dpi=150, facecolor='white')
        plt.close()
        buf.seek(0)
        return base64.b64encode(buf.getvalue()).decode('ascii')
    except:
        return None


# ─── Question Generation ─────────────────────────────────────────────────────

def generate_question(diagram_type: str, difficulty: str, subtopic: str) -> dict | None:
    """Generate a single question with diagram using Azure OpenAI."""
    config = DIAGRAM_CONFIGS[diagram_type]
    
    prompt = config["user_template"].format(
        difficulty=difficulty,
        subtopic=subtopic,
    )
    
    try:
        resp = client.chat.completions.create(
            model=DEPLOYMENT,
            messages=[
                {"role": "system", "content": config["system_prompt"]},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content
        q = json.loads(raw)
        
        # Normalize correctAnswer
        ca = q.get("correctAnswer", q.get("correct_answer", 0))
        if isinstance(ca, str):
            ca = ca.strip().upper()
            if ca in "ABCD":
                ca = "ABCD".index(ca)
            elif ca.isdigit():
                ca = int(ca)
                if ca >= 1 and ca <= 4:
                    ca -= 1  # 1-indexed → 0-indexed
            else:
                ca = 0
        q["correctAnswer"] = int(ca) if 0 <= int(ca) <= 3 else 0
        
        # Normalize options
        opts = q.get("options", q.get("choices", []))
        if len(opts) != 4:
            print(f"  ⚠ Invalid options count: {len(opts)}")
            return None
        q["options"] = opts
        
        # Must have diagram_description
        diagdesc = q.get("diagram_description", "")
        if not diagdesc or len(diagdesc) < 20:
            print(f"  ⚠ Missing or short diagram_description")
            return None
        
        # Normalize other fields
        q["difficulty"] = difficulty
        q["subtopic"] = subtopic
        q["moduleType"] = config["moduleType"]
        q["category"] = config["category"]
        q["visualType"] = config["visualType"]
        
        if "explanation" not in q:
            q["explanation"] = "See the diagram for reference."
        
        # Normalize wrongAnswerExplanations
        we = q.get("wrongAnswerExplanations", {})
        if isinstance(we, dict):
            # Remove the correct answer key
            correct_letter = chr(65 + q["correctAnswer"])
            we.pop(correct_letter, None)
            q["wrongAnswerExplanations"] = we
        
        return q
        
    except Exception as e:
        print(f"  ⚠ Error generating question: {e}")
        return None


def generate_diagram_for_question(q: dict) -> str | None:
    """Generate matplotlib diagram for a question. Returns base64 PNG or None."""
    desc = q.get("diagram_description", "")
    question_text = q.get("question", "")
    
    # Try up to 2 times to generate + render
    for attempt in range(2):
        try:
            code = generate_matplotlib_code(desc, question_text)
            if code:
                img = render_matplotlib(code, desc)
                if img and len(img) > 200:  # Minimum viable image
                    return img
        except KeyboardInterrupt:
            raise
        except Exception as e:
            print(f"    ⚠ Diagram attempt {attempt+1} error: {e}")
        if attempt == 0:
            print(f"    Retrying diagram generation...")
            time.sleep(2)
    
    # Final fallback
    return render_fallback_diagram(desc)


# ─── Batch Generation ─────────────────────────────────────────────────────────

def generate_batch(diagram_type: str, count: int) -> dict:
    """Generate a batch of questions with diagrams."""
    config = DIAGRAM_CONFIGS[diagram_type]
    subtopics = config["subtopics"]
    
    # Calculate difficulty distribution
    n_easy = max(1, round(count * DIFFICULTY_DISTRIBUTION["easy"]))
    n_hard = max(1, round(count * DIFFICULTY_DISTRIBUTION["hard"]))
    n_medium = count - n_easy - n_hard
    
    plan = []
    for diff, n in [("easy", n_easy), ("medium", n_medium), ("hard", n_hard)]:
        for i in range(n):
            st = subtopics[i % len(subtopics)]
            plan.append((diff, st))
    
    batch_id = f"diagram-{int(time.time())}-{diagram_type}"
    batch = {
        "batchId": batch_id,
        "topic": diagram_type,
        "moduleType": config["moduleType"],
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "promptVersion": "diagram-v1.0",
        "diagramType": diagram_type,
        "totalRequested": count,
        "totalGenerated": 0,
        "totalValid": 0,
        "questions": [],
    }
    
    print(f"\n📦 Generating {count} {diagram_type} diagram questions")
    print(f"   Distribution: {n_easy} easy, {n_medium} medium, {n_hard} hard")
    print(f"   Subtopics: {', '.join(subtopics)}")
    
    for idx, (diff, st) in enumerate(plan):
        print(f"\n  [{idx+1}/{count}] {diff}/{st}...")
        
        try:
            # Step 1: Generate question
            q = generate_question(diagram_type, diff, st)
            if not q:
                print(f"    ✗ Question generation failed")
                continue
            print(f"    ✓ Question generated")
            
            # Step 2: Generate diagram
            img_b64 = generate_diagram_for_question(q)
            if not img_b64:
                print(f"    ✗ Diagram generation failed, skipping")
                continue
            print(f"    ✓ Diagram rendered ({len(img_b64)} chars base64)")
            
            # Add to batch
            q["_imageBase64"] = img_b64
            q["_imageMimeType"] = "image/png"
            q["_imageAlt"] = q.get("diagram_description", "")[:500]
            q["_batchId"] = batch_id
            q["_generatedAt"] = datetime.now(timezone.utc).isoformat()
            
            batch["questions"].append(q)
            batch["totalGenerated"] += 1
            batch["totalValid"] += 1
            
            # Rate limit delay
            time.sleep(1)
        
        except KeyboardInterrupt:
            print(f"\n⚠ Interrupted! Saving {len(batch['questions'])} questions generated so far...")
            break
        except Exception as e:
            print(f"    ✗ Unexpected error: {e}")
            continue
    
    return batch


def save_batch(batch: dict) -> Path:
    """Save batch to JSON file."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    filepath = OUTPUT_DIR / f"{batch['batchId']}.json"
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(batch, f, indent=2, ensure_ascii=False)
    print(f"\n💾 Saved: {filepath}")
    print(f"   Valid: {batch['totalValid']}/{batch['totalRequested']}")
    return filepath


def export_batch_html(batch: dict, filepath: Path):
    """Export batch to HTML for visual review."""
    html_path = filepath.with_suffix('.html')
    rows = []
    for i, q in enumerate(batch["questions"], 1):
        img = q.get("_imageBase64", "")
        img_html = f'<img src="data:image/png;base64,{img}" style="max-width:600px;border:1px solid #ddd;border-radius:8px;">' if img else ''
        opts = ''.join(
            f'<li style="{"background:#dcfce7;font-weight:bold;" if j == q["correctAnswer"] else ""}">{o}</li>'
            for j, o in enumerate(q.get("options", []))
        )
        rows.append(f"""
        <div style="background:#fff;border-radius:12px;padding:20px;margin:16px 0;box-shadow:0 2px 8px rgba(0,0,0,.1);border-left:4px solid {'#22c55e' if q['difficulty']=='easy' else '#f59e0b' if q['difficulty']=='medium' else '#ef4444'};">
          <div style="font-size:.85em;color:#888;">#{i} | {q['difficulty']} | {q.get('subtopic','')} | {q.get('visualType','')}</div>
          <p style="font-weight:600;margin:8px 0;">{q['question']}</p>
          {img_html}
          <ul style="list-style:none;padding:0;margin:12px 0;">{opts}</ul>
          <details><summary style="cursor:pointer;color:#667eea;">Show Explanation</summary><p>{q.get('explanation','')}</p></details>
        </div>""")
    
    html = f"""<!DOCTYPE html><html><head><meta charset="UTF-8"><title>{batch['batchId']}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
    <style>body{{font-family:sans-serif;background:#f0f2f5;padding:20px;max-width:900px;margin:0 auto}}</style>
    </head><body>
    <h1>🖼️ {batch['batchId']}</h1>
    <p>{batch['totalValid']} questions | {batch['diagramType']} | {batch['generatedAt']}</p>
    {''.join(rows)}
    <script>document.addEventListener("DOMContentLoaded",function(){{if(typeof renderMathInElement==='function')renderMathInElement(document.body,{{delimiters:[{{left:"$$",right:"$$",display:true}},{{left:"$",right:"$",display:false}}],throwOnError:false}})}});</script>
    </body></html>"""
    
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"📄 HTML: {html_path}")


# ─── Import to Database ──────────────────────────────────────────────────────

def import_batch_to_db(batch_path: str):
    """Import a diagram batch JSON into the database using Prisma via subprocess."""
    # We'll call the TypeScript import script
    import subprocess
    
    # Read batch to verify
    with open(batch_path, 'r') as f:
        batch = json.load(f)
    
    count = len(batch.get("questions", []))
    if count == 0:
        print(f"⚠ Empty batch: {batch_path}")
        return
    
    print(f"\n📥 Importing {count} diagram questions from {batch_path}")
    
    # Use the TS import script
    ts_script = SCRIPT_DIR / "import-diagram-batch.ts"
    result = subprocess.run(
        ["npx", "tsx", str(ts_script), str(batch_path)],
        cwd=str(PROJECT_DIR),
        capture_output=True, text=True, timeout=120
    )
    
    if result.returncode == 0:
        print(result.stdout)
    else:
        print(f"❌ Import failed:\n{result.stderr}\n{result.stdout}")


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="DuckSAT Diagram Question Generator")
    parser.add_argument("--type", choices=list(DIAGRAM_CONFIGS.keys()) + ["all"], default="all",
                        help="Diagram type to generate")
    parser.add_argument("--count", type=int, default=20,
                        help="Number of questions to generate (per type if --type=all)")
    parser.add_argument("--import-batch", type=str,
                        help="Import a specific batch JSON file to database")
    parser.add_argument("--import-all", action="store_true",
                        help="Import all diagram batch files to database")
    
    args = parser.parse_args()
    
    # Import mode
    if args.import_batch:
        import_batch_to_db(args.import_batch)
        return
    
    if args.import_all:
        batches = sorted(glob.glob(str(OUTPUT_DIR / "diagram-*.json")))
        if not batches:
            print("No diagram batch files found.")
            return
        for bp in batches:
            import_batch_to_db(bp)
        return
    
    # Generation mode
    if args.type == "all":
        total = args.count
        print(f"🚀 Generating {total} diagram questions across all types")
        for dtype, share in ALL_TYPE_DISTRIBUTION.items():
            n = max(1, round(total * share))
            batch = generate_batch(dtype, n)
            fp = save_batch(batch)
            export_batch_html(batch, fp)
    else:
        batch = generate_batch(args.type, args.count)
        fp = save_batch(batch)
        export_batch_html(batch, fp)
    
    print("\n✅ Generation complete!")
    print(f"   Output: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
