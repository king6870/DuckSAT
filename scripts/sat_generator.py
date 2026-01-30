
# 🦆 DuckSAT Unified Question Generator (Python Script Version)
# ============================================================
# Generate both Math and Reading SAT questions.
# Usage: python scripts/sat_generator.py

import os
import json
import requests
import time
import sys
import subprocess
from datetime import datetime
from dotenv import load_dotenv

# Ensure packages are installed
try:
    import openai
    import psycopg2
except ImportError:
    print("Installing required packages...")
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user', 'openai', 'psycopg2-binary', 'python-dotenv', 'requests'])
    import openai
    import psycopg2

from openai import AzureOpenAI

# Import local helpers
try:
    import db_helper
except ImportError:
    # Add current directory to path if running from scripts/
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    import db_helper

# Load environment variables
load_dotenv()
load_dotenv('.env.local')

endpoint = os.getenv("ENDPOINT_URL") or os.getenv("AZURE_OPENAI_ENDPOINT")
api_key = os.getenv("AZURE_OPENAI_API_KEY")
api_version = os.getenv("API_VERSION", "2024-12-01-preview")
deployment_name = os.getenv("DEPLOYMENT_NAME") or os.getenv("AZURE_OPENAI_DEPLOYMENT")
dalle_deployment = os.getenv("DALLE_DEPLOYMENT_NAME", "dall-e-3")

# Extract base endpoint if full URL is provided
if endpoint and '/deployments/' in endpoint:
    # Extract base URL: https://xxx.cognitiveservices.azure.com
    endpoint = endpoint.split('/openai/')[0] if '/openai/' in endpoint else endpoint.split('/deployments/')[0]
    print("INFO: Extracted base endpoint from full URL")

if not all([endpoint, api_key, deployment_name]):
    print("❌ Missing environment variables. Please check .env file.")
    sys.exit(1)

print(f"Config: Endpoint={endpoint}")
print(f"Config: Deployment={deployment_name}")
print(f"Config: API Version={api_version}")

client = AzureOpenAI(
    azure_endpoint=endpoint,
    api_key=api_key,
    api_version=api_version
)

print(f"OK: Azure OpenAI configured: {deployment_name}")
print(f"OK: DALL-E deployment: {dalle_deployment}")

# ========== GENERATION SETTINGS ==========

# Math question counts
MATH_COUNTS = {
    'Equations': 1,        # Equations/Expressions
    'Geometry': 1,          # Geometry
    'WordProblems': 1,     # Word Problems
    'Functions': 1,         # Functions
    'Data': 1               # Data Analysis
}

# Reading question counts
READING_COUNTS = {
    'FillInBlank': 1,      # Fill in the Blank
    'Details': 1,           # Details
    'Summary': 1,           # Summary/Main Purpose
    'PassageDiagram': 1,    # Passage + Diagram
    'Research': 1           # Research/Claims
}

DELAY_SECONDS = 0

# Image Generation Settings
ENABLE_IMAGE_GENERATION = False

# Question prompts
MATH_PROMPTS = {
    'Equations': {
        'system': 'You are an expert SAT math question writer.',
        'user': 'Create a single SAT math Equations question. Include radicals/variables. Return ONLY JSON: {"question", "choices": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A", "explanation", "diagram_description"}'
    },
    'Geometry': {
        'system': 'You are an expert SAT math question writer.',
        'user': 'Create a single SAT Geometry question with a diagram. Return ONLY JSON: {"question", "choices": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A", "explanation", "diagram_description"}'
    },
    'WordProblems': {
        'system': 'You are an expert SAT math question writer.',
        'user': 'Create a single SAT Word Problem. Return ONLY JSON: {"question", "choices": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A", "explanation", "diagram_description"}'
    },
    'Functions': {
        'system': 'You are an expert SAT math question writer.',
        'user': 'Create a single SAT Functions question. Return ONLY JSON: {"question", "choices": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A", "explanation", "diagram_description"}'
    },
    'Data': {
        'system': 'You are an expert SAT math question writer.',
        'user': 'Create a single SAT Data Analysis question with a chart/graph. Return ONLY JSON: {"question", "choices": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A", "explanation", "diagram_description"}'
    }
}

READING_PROMPTS = {
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
        'user': 'Create a single SAT Reading question with passage AND diagram (chart/graph). Return ONLY JSON: {"passage", "question", "choices": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A", "explanation", "diagram_description"}'
    },
    'Research': {
        'system': 'You are an expert SAT Reading question writer.',
        'user': 'Create a single SAT Reading Research/Claims question. Return ONLY JSON: {"passage", "question", "choices": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct_answer": "A", "explanation", "diagram_description": null}'
    }
}

# Helper functions
def generate_question(question_type, prompts):
    """Generate a single question."""
    try:
        prompt_config = prompts[question_type]
        
        response = client.chat.completions.create(
            model=deployment_name,
            messages=[
                {"role": "system", "content": prompt_config['system']},
                {"role": "user", "content": prompt_config['user']}
            ],
            temperature=1,
            max_completion_tokens=10000  # FIXED: Increased from 1500 to 10000
        )
        
        # Check if response exists
        if not response.choices or not response.choices[0].message.content:
            print(f"  ⚠️  Empty or invalid response received from API")
            print(f"  Response: {response}")
            return None
        
        content = response.choices[0].message.content.strip()
        
        # Extract JSON
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        
        question_data = json.loads(content)
        question_data["timestamp"] = datetime.now().isoformat()
        
        return question_data
    except json.JSONDecodeError as e:
        print(f"  ❌ JSON decode error: {e}")
        if 'content' in locals():
            print(f"  Raw content (first 100 chars): {content[:100]}...")
        return None
    except Exception as e:
        print(f"  ❌ Error generating question: {type(e).__name__}: {e}")
        return None

def generate_diagram(description):
    """Generate diagram using DALL-E."""
    try:
        enhanced_prompt = f"""Clear educational diagram for SAT question.
Style: Clean line drawing, black on white, minimal text, clear labels.
Content: {description}
Professional, easy to read."""
        
        response = client.images.generate(
            model=dalle_deployment,
            prompt=enhanced_prompt[:1000],
            size="1024x1024",
            quality="standard",
            n=1
        )
        
        image_url = response.data[0].url
        image_response = requests.get(image_url)
        
        if image_response.status_code == 200:
            return image_response.content
        return None
    except Exception as e:
        print(f"  ❌ Error generating diagram: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    # Generate Math Questions
    print("\n" + "="*60)
    print("GENERATING MATH QUESTIONS")
    print("="*60)

    math_successful = 0
    math_failed = 0

    for question_type, count in MATH_COUNTS.items():
        if count == 0:
            continue
        
        print(f"\n{question_type}: {count} questions")
        print("-" * 40)
        
        for i in range(count):
            print(f"  [{i+1}/{count}] Generating...")
            
            # Generate question
            question_data = generate_question(question_type, MATH_PROMPTS)
            
            if not question_data:
                math_failed += 1
                continue
            
            # Generate diagram if needed
            image_data = None
            diagram_desc = question_data.get('diagram_description')
            if ENABLE_IMAGE_GENERATION and diagram_desc and diagram_desc.lower() not in ['null', 'none', 'n/a', '']:
                print(f"  Generating diagram...")
                image_data = generate_diagram(diagram_desc)
            elif diagram_desc and diagram_desc.lower() not in ['null', 'none', 'n/a', '']:
                print(f"  Skipping diagram generation (disabled)")
            
            # Insert to database
            success = db_helper.insert_question(question_type, question_data, image_data)
            
            if success:
                math_successful += 1
                print(f"  ✓ Inserted successfully")
            else:
                math_failed += 1
            
            if DELAY_SECONDS > 0:
                time.sleep(DELAY_SECONDS)

    print(f"\n{'='*60}")
    print(f"Math Summary: {math_successful} successful, {math_failed} failed")
    print(f"{'='*60}")

    # Generate Reading Questions
    print("\n" + "="*60)
    print("GENERATING READING QUESTIONS")
    print("="*60)

    reading_successful = 0
    reading_failed = 0

    for question_type, count in READING_COUNTS.items():
        if count == 0:
            continue
        
        print(f"\n{question_type}: {count} questions")
        print("-" * 40)
        
        for i in range(count):
            print(f"  [{i+1}/{count}] Generating...")
            
            # Generate question
            question_data = generate_question(question_type, READING_PROMPTS)
            
            if not question_data:
                reading_failed += 1
                continue
            
            # Generate diagram if needed
            image_data = None
            diagram_desc = question_data.get('diagram_description')
            if ENABLE_IMAGE_GENERATION and diagram_desc and diagram_desc.lower() not in ['null', 'none', 'n/a', '']:
                print(f"  Generating diagram...")
                image_data = generate_diagram(diagram_desc)
            elif diagram_desc and diagram_desc.lower() not in ['null', 'none', 'n/a', '']:
                print(f"  Skipping diagram generation (disabled)")
            
            # Insert to database
            success = db_helper.insert_question(question_type, question_data, image_data)
            
            if success:
                reading_successful += 1
                print(f"  ✓ Inserted successfully")
            else:
                reading_failed += 1
            
            if DELAY_SECONDS > 0:
                time.sleep(DELAY_SECONDS)

    # Final Summary
    total_successful = math_successful + reading_successful
    total_failed = math_failed + reading_failed
    total_attempted = total_successful + total_failed

    print("\n" + "="*60)
    print("GENERATION COMPLETE")
    print("="*60)
    print(f"\nMath Questions:")
    print(f"  ✓ Successful: {math_successful}")
    print(f"  ✗ Failed: {math_failed}")
    print(f"\nReading Questions:")
    print(f"  ✓ Successful: {reading_successful}")
    print(f"  ✗ Failed: {reading_failed}")
    print(f"\nTotal:")
    print(f"  ✓ Successful: {total_successful}")
    print(f"  ✗ Failed: {total_failed}")
    if total_attempted > 0:
        print(f"  Success Rate: {total_successful / total_attempted * 100:.1f}%")
    print("\n" + "="*60)

if __name__ == "__main__":
    main()
