# --- Prompts and Types ---
MATH_TYPES = ['Equations', 'Geometry', 'WordProblems', 'Functions', 'Data']
READING_TYPES = ['FillInBlank', 'Details', 'Summary', 'PassageDiagram', 'Research']
ALL_TYPES = MATH_TYPES + READING_TYPES
PROMPTS = {
    'Equations': {
        'system': "You are an SAT question generator. CRITICAL RULES: 1. ALL math must be wrapped in dollar signs ($...$). Example: $\\sqrt{x+1}$. 2. NEVER write 'sqrt(x)' or 'x^2' without dollars. 3. Geometry questions MUST include a 'diagram_description'. 4. For currency, write '25 dollars' or 'USD 25'. Do NOT use the dollar sign ($) for money.",
        'user': 'Create a single SAT math Equations question. Use LaTeX notation ($\\sqrt{x}$, $\\frac{a}{b}$, $x^2$) for all math in question text. Include radicals/variables. Return ONLY JSON: {"question", "choices": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A", "explanation", "diagram_description": null OR "description of visual diagram"}'
    },
    'Geometry': {
        'system': "You are an SAT question generator. CRITICAL RULES: 1. ALL math must be wrapped in dollar signs ($...$). Example: $\\sqrt{x+1}$. 2. NEVER write 'sqrt(x)' or 'x^2' without dollars. 3. Geometry questions MUST include a 'diagram_description'. 4. For currency, write '25 dollars' or 'USD 25'. Do NOT use the dollar sign ($) for money.",
        'user': 'Create SAT Geometry question with diagram. REQUIRED: diagram_description must describe specific visual (e.g., "Right triangle ABC, angle C=90°, AB=5, BC=3"). Use LaTeX with $ delimiters for all math: "Find $x$ if $\\sqrt{x^2+9} = 5$". Return ONLY JSON: {"question", "choices": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A", "explanation", "diagram_description": "description of visual diagram"}'
    },
    'WordProblems': {
        'system': "You are an SAT question generator. CRITICAL RULES: 1. ALL math must be wrapped in dollar signs ($...$). Example: $\\sqrt{x+1}$. 2. NEVER write 'sqrt(x)' or 'x^2' without dollars. 3. Geometry questions MUST include a 'diagram_description'. 4. For currency, write '25 dollars' or 'USD 25'. Do NOT use the dollar sign ($) for money.",
        'user': 'Create a single SAT Word Problem. Return ONLY JSON: {"question", "choices": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A", "explanation", "diagram_description": null OR "description of visual diagram"}'
    },
    'Functions': {
        'system': "You are an SAT question generator. CRITICAL RULES: 1. ALL math must be wrapped in dollar signs ($...$). Example: $\\sqrt{x+1}$. 2. NEVER write 'sqrt(x)' or 'x^2' without dollars. 3. Geometry questions MUST include a 'diagram_description'. 4. For currency, write '25 dollars' or 'USD 25'. Do NOT use the dollar sign ($) for money.",
        'user': 'Create a single SAT Functions question. Use LaTeX notation ($\\sqrt{x}$, $\\frac{a}{b}$, $x^2$) for all math in question text. Return ONLY JSON: {"question", "choices": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A", "explanation", "diagram_description": null OR "description of visual diagram"}'
    },
    'Data': {
        'system': "You are an SAT question generator. CRITICAL RULES: 1. ALL math must be wrapped in dollar signs ($...$). Example: $\\sqrt{x+1}$. 2. NEVER write 'sqrt(x)' or 'x^2' without dollars. 3. Geometry questions MUST include a 'diagram_description'. 4. For currency, write '25 dollars' or 'USD 25'. Do NOT use the dollar sign ($) for money.",
        'user': 'Create a single SAT Data Analysis question with a chart/graph. Return ONLY JSON: {"question", "choices": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A", "explanation", "diagram_description": null OR "description of visual diagram"}'
    },
    'FillInBlank': {
        'system': 'You are an expert SAT Reading question writer.',
        'user': 'Create a single SAT Reading Fill-in-Blank question. Return ONLY JSON: {"passage", "question", "choices": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A", "explanation", "diagram_description": null}'
    },
    'Details': {
        'system': 'You are an expert SAT Reading question writer.',
        'user': 'Create a single SAT Reading Details question. Return ONLY JSON: {"passage", "question", "choices": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A", "explanation", "diagram_description": null}'
    },
    'Summary': {
        'system': 'You are an expert SAT Reading question writer.',
        'user': 'Create a single SAT Reading Summary question. Return ONLY JSON: {"passage", "question", "choices": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A", "explanation", "diagram_description": null}'
    },
    'PassageDiagram': {
        'system': 'You are an expert SAT Reading question writer.',
        'user': 'Create a single SAT Reading question with passage AND diagram (chart/graph). Return ONLY JSON: {"passage", "question", "choices": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A", "explanation", "diagram_description": null OR "description of visual diagram"}'
    },
    'Research': {
        'system': 'You are an expert SAT Reading question writer.',
        'user': 'Create a single SAT Reading Research/Claims question. Return ONLY JSON: {"passage", "question", "choices": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A", "explanation", "diagram_description": null}'
    }
}
# --- Imports ---
import json
import base64
from io import BytesIO
import matplotlib.pyplot as plt
import os
import sys
import argparse
from dotenv import load_dotenv
import openai

# Load environment variables from .env or variables file
if os.path.exists('.env'):
    load_dotenv('.env')
elif os.path.exists('variables'):
    load_dotenv('variables')

# Configure OpenAI client for Azure
openai.api_type = "azure"
openai.api_key = os.environ.get("AZURE_OPENAI_API_KEY")
openai.api_version = os.environ.get("API_VERSION", "2024-12-01-preview")
# Ensure AZURE_OPENAI_ENDPOINT is set for new SDK
if not os.environ.get("AZURE_OPENAI_ENDPOINT"):
    endpoint = os.environ.get("ENDPOINT_URL")
    if endpoint:
        os.environ["AZURE_OPENAI_ENDPOINT"] = endpoint

# --- Robustified Functions ---
def robust_generate_question(deployment_name, question_type, prompts, feedback=None, max_retries=1):
    for attempt in range(max_retries):
        try:
            print(f"[DEBUG] Calling OpenAI for {question_type}, attempt {attempt+1}")
            system_prompt = prompts[question_type]['system']
            user_prompt = prompts[question_type]['user']
            if feedback:
                user_prompt += f"\nFEEDBACK: {feedback}"
            print(f"[DEBUG] System prompt: {system_prompt}")
            print(f"[DEBUG] User prompt: {user_prompt}")
            response = openai.chat.completions.create(
                model=deployment_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"}
            )
            print(f"[DEBUG] OpenAI response: {response}")
            question_data = json.loads(response.choices[0].message.content)
            print(f"[DEBUG] Parsed question_data: {question_data}")
            # Patch for common LLM output issues
            if 'question' not in question_data:
                if 'final' in question_data:
                    if isinstance(question_data['final'], str):
                        question_data = json.loads(question_data['final'])
                    else:
                        question_data = question_data['final']
                elif 'problem' in question_data:
                    question_data['question'] = question_data['problem']
                if 'answer_choices' in question_data and 'choices' not in question_data:
                    question_data['choices'] = question_data['answer_choices']
                if 'diagram' in question_data and 'diagram_description' not in question_data:
                    question_data['diagram_description'] = question_data['diagram']
            print(f"[DEBUG] Final question_data: {question_data}")
            return question_data
        except Exception as e:
            print(f"[robust_generate_question] Error: {e}")
            import traceback
            traceback.print_exc()
            if attempt == max_retries - 1:
                raise
    return None

def robust_review_question(deployment_name, question_data):
    try:
        print(f"[DEBUG] Calling OpenAI for review_question")
        response = openai.chat.completions.create(
            model=deployment_name,
            messages=[
                {"role": "system", "content": "You are a mathematical validation expert. Your job is to verify that geometry problems are mathematically sound and that diagrams accurately represent the problem."},
                {"role": "user", "content": f"""Analyze this SAT math problem for technical correctness:\nQUESTION:\n{question_data.get('question','')}\nDIAGRAM DESCRIPTION:\n{question_data.get('diagram_description','')}\n\nPerform the following validation checks:\n1. GEOMETRIC VALIDITY: ...\n2. QUESTION-DIAGRAM MATCH: ...\n3. SOLVABILITY: ...\n4. TERMINOLOGY ACCURACY: ...\nReturn ONLY a JSON object: {{ ... }}\nBe VERY strict. If the question asks about 'triangle DEF' but D, E, F are collinear, this is a CRITICAL ERROR and FAIL."""}
            ],
            response_format={"type": "json_object"}
        )
        print(f"[DEBUG] OpenAI review response: {response}")
        review = json.loads(response.choices[0].message.content)
        print(f"[DEBUG] Parsed review: {review}")
        status = review.get('overall_status', 'approved')
        feedback = review.get('validation_details', '')
        return {'status': status.lower(), 'feedback': feedback}
    except Exception as e:
        print(f"[robust_review_question] Error: {e}")
        import traceback
        traceback.print_exc()
        return {'status': 'approved', 'feedback': ''}

def robust_generate_matplotlib_code(deployment_name, diagram_desc, question_text):
    try:
        print(f"[DEBUG] Calling OpenAI for matplotlib code generation")
        system_prompt = "You are an expert in creating matplotlib code for mathematical diagrams. You must create diagrams that EXACTLY match the problem description with NO errors or inconsistencies."
        user_prompt = f"Create Python matplotlib code to draw this diagram: {diagram_desc}\n\nCRITICAL REQUIREMENTS: ...\nThe diagram MUST exactly match the problem statement in {question_text}. ...\nReturn ONLY a JSON object with this structure: {{ 'code': 'complete matplotlib code' }}"
        print(f"[DEBUG] System prompt: {system_prompt}")
        print(f"[DEBUG] User prompt: {user_prompt}")
        response = openai.chat.completions.create(
            model=deployment_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"}
        )
        print(f"[DEBUG] OpenAI matplotlib response: {response}")
        code_data = json.loads(response.choices[0].message.content)
        print(f"[DEBUG] Parsed code_data: {code_data}")
        return code_data['code'] if 'code' in code_data else None
    except Exception as e:
        print(f"[robust_generate_matplotlib_code] Error: {e}")
        import traceback
        traceback.print_exc()
        return None

def robust_render_matplotlib_diagram(code, diagram_desc):
    img_base64 = None
    try:
        print(f"[DEBUG] Rendering matplotlib diagram")
        safe_code = '\n'.join(
            line if 'plt.show' not in line else f'# {line}'
            for line in code.splitlines()
        )
        exec_globals = {'BytesIO': BytesIO, 'plt': plt}
        exec(safe_code, exec_globals)
        if 'buffer' in exec_globals:
            buffer = exec_globals['buffer']
            buffer.seek(0)
            img_base64 = base64.b64encode(buffer.getvalue()).decode()
        else:
            for key, value in exec_globals.items():
                if isinstance(value, BytesIO):
                    buffer = value
                    buffer.seek(0)
                    img_base64 = base64.b64encode(buffer.getvalue()).decode()
                    break
            else:
                raise Exception("No buffer variable found in generated code")
    except Exception as exc:
        print(f"[Fallback] Matplotlib rendering failed: {exc}")
        import traceback
        traceback.print_exc()
        fig, ax = plt.subplots(figsize=(10, 8))
        ax.text(0.5, 0.5, "Diagram could not be generated.\n\nDescription:\n" + diagram_desc, ha='center', va='center', wrap=True, fontsize=12, bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
        ax.axis('off')
        buffer = BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight', dpi=150, facecolor='white')
        plt.close()
        buffer.seek(0)
        img_base64 = base64.b64encode(buffer.getvalue()).decode()
    return img_base64

def create_fallback_diagram(desc):
    print('[DEBUG] Dummy fallback diagram')
    return None

def strict_validate_and_normalize(question_data):
    # Validate choices
    choices = question_data.get('choices', [])
    if not isinstance(choices, list):
        return None, 'choices is not a list'
    if len(choices) > 4:
        choices = choices[:4]
        question_data['choices'] = choices
    elif len(choices) < 4:
        return None, 'Fewer than 4 choices'
    correct_answer = question_data.get('correct_answer', '')
    if isinstance(correct_answer, int):
        if 0 <= correct_answer < 4:
            correct_answer_letter = chr(ord('A') + correct_answer)
        else:
            return None, 'correct_answer index out of range'
    elif isinstance(correct_answer, str):
        correct_answer = correct_answer.strip()
        if correct_answer.isdigit():
            idx = int(correct_answer)
            if 0 <= idx < 4:
                correct_answer_letter = chr(ord('A') + idx)
            elif 1 <= idx <= 4:
                correct_answer_letter = chr(ord('A') + idx - 1)
            else:
                return None, 'correct_answer string index out of range'
        elif correct_answer.upper() in ['A', 'B', 'C', 'D']:
            correct_answer_letter = correct_answer.upper()
        else:
            return None, f"correct_answer '{correct_answer}' is not A-D or index"
    else:
        return None, 'correct_answer is not str or int'
    question_data['correct_answer'] = correct_answer_letter
    return question_data, None
# --- Argument Parsing ---
def get_arg_env(key, default=None, argtype=str):
    import argparse
    import os
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument(f'--{key.replace("_", "-")}', type=argtype)
    args, _ = parser.parse_known_args()
    val = getattr(args, key, None)
    if val is not None:
        return argtype(val)
    env_val = os.environ.get(key.upper())
    if env_val is not None:
        return argtype(env_val)
    return default
# --- Main Batch Generation, Error Handling, and Summary Output ---
def main():

    try:
        print("\n[DEBUG] --- ENVIRONMENT CHECK ---")
        print(f"[DEBUG] AZURE_OPENAI_API_KEY: {os.environ.get('AZURE_OPENAI_API_KEY')}")
        print(f"[DEBUG] ENDPOINT_URL: {os.environ.get('ENDPOINT_URL')}")
        print(f"[DEBUG] DEPLOYMENT_NAME: {os.environ.get('DEPLOYMENT_NAME')}")
        print(f"[DEBUG] API_VERSION: {os.environ.get('API_VERSION')}")
        deployment_name = get_arg_env('deployment_name', os.environ.get('DEPLOYMENT_NAME', 'gpt-5-nano'))
        enable_image_generation = True
        delay_seconds = int(get_arg_env('delay_seconds', 0, int))
        max_retries = 3
        num_per_type = int(get_arg_env('num_per_type', 5, int))

        print(f"[INFO] Generating {num_per_type} questions for each of 10 types (total {num_per_type * len(ALL_TYPES)})")
        all_questions = []
        successful = 0
        failed = 0
        # --- FORCE MINIMAL WORKING PATH FOR 'Equations' TYPE ---
        print("\n[DEBUG] --- FORCING MINIMAL WORKING PATH FOR 'Equations' TYPE ---")
        # Test connection removed - proceeding with actual question generation
        print(f"=== Finished type: {question_type} ===\n")
        print(f"[SUMMARY] {successful} questions inserted, {failed} failed so far.")
        # Write HTML output (optional QA)
        html_rows = []
        for idx, q in enumerate(all_questions, 1):
            img_html = f'<img src="data:image/png;base64,{q["diagram"]}" style="max-width:400px;max-height:300px;">' if q["diagram"] else ''
            choices_html = '<ul>' + ''.join(f'<li>{c}</li>' for c in q['choices']) + '</ul>' if q['choices'] else ''
            html_rows.append(f"<tr><td><b>Q{idx}:</b> {q['question']}<br><i>{q['diagram_desc']}</i><br>{img_html}<br>{choices_html}</td></tr>")
        html_content = f"""
        <html><head><title>SAT Geometry Questions</title></head><body>
        <h1>SAT Geometry Questions (Variety, with Diagrams)</h1>
        <table border='1' cellpadding='10' style='border-collapse:collapse;'>
        {''.join(html_rows)}
        </table>
        </body></html>
        """
        with open("sat_geometry_questions.html", "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"\nHTML file 'sat_geometry_questions.html' generated with all questions and diagrams.")
        print(f"[INFO] {successful} questions inserted, {failed} failed.")
        if not all_questions:
            print("[ERROR] No questions were generated. Please check your API credentials, endpoint, and deployment name.")
    except Exception as main_exc:
        print("[FATAL ERROR] Exception in main():", main_exc)
        import traceback
        traceback.print_exc()

