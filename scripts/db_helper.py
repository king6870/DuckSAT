
import os
import json
import re
import uuid
import psycopg2
from psycopg2.extras import Json


# Always force reload .env from project root, regardless of working directory
from dotenv import load_dotenv
import os
project_root = os.path.dirname(os.path.dirname(__file__))
load_dotenv(os.path.join(project_root, '.env'), override=True)
load_dotenv(os.path.join(project_root, '.env.local'), override=True)

DATABASE_URL = os.getenv('DATABASE_URL') or os.getenv('DATABASE_URL_UNPOOLED')
print(f"[db_helper] DATABASE_URL loaded: {DATABASE_URL}")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment variables")

# Category and subtopic mappings
CATEGORY_MAPPINGS = {
    # Math types
    "Equations": {"moduleType": "math", "category": "Algebra", "subtopic": "equations"},
    "Geometry": {"moduleType": "math", "category": "Geometry", "subtopic": "geometry"},
    "WordProblems": {"moduleType": "math", "category": "Problem Solving", "subtopic": "word-problems"},
    "Functions": {"moduleType": "math", "category": "Functions", "subtopic": "functions"},
    "Data": {"moduleType": "math", "category": "Data Analysis", "subtopic": "data-analysis"},
    
    # Reading types
    "FillInBlank": {"moduleType": "reading-writing", "category": "Grammar", "subtopic": "grammar"},
    "Details": {"moduleType": "reading-writing", "category": "Reading Comprehension", "subtopic": "details"},
    "Summary": {"moduleType": "reading-writing", "category": "Reading Comprehension", "subtopic": "summary"},
    "PassageDiagram": {"moduleType": "reading-writing", "category": "Reading Comprehension", "subtopic": "data-interpretation"},
    "Research": {"moduleType": "reading-writing", "category": "Reading Comprehension", "subtopic": "research"}
}

def get_db_connection():
    """Create and return a database connection."""
    return psycopg2.connect(DATABASE_URL)

def ensure_topic_and_subtopic(conn, module_type, category, subtopic_name):
    """Ensure topic and subtopic exist, create if needed. Returns subtopic_id."""
    cursor = conn.cursor()
    
    # Check/create topic
    cursor.execute(
        """
        SELECT id FROM topics WHERE name = %s AND "moduleType" = %s
        """,
        (category, module_type)
    )
    topic_result = cursor.fetchone()
    
    if topic_result:
        topic_id = topic_result[0]
    else:
        topic_id = str(uuid.uuid4())
        cursor.execute(
            """
            INSERT INTO topics (id, name, "moduleType", description, "updatedAt", "createdAt")
            VALUES (%s, %s, %s, %s, NOW(), NOW())
            RETURNING id
            """,
            (topic_id, category, module_type, f"{category} topics for SAT {module_type}")
        )
        # topic_id = cursor.fetchone()[0] # Already generated
        print(f"Created topic: {category}")
    
    # Check/create subtopic
    cursor.execute(
        """
        SELECT id FROM subtopics WHERE name = %s AND "topicId" = %s
        """,
        (subtopic_name, topic_id)
    )
    subtopic_result = cursor.fetchone()
    
    if subtopic_result:
        subtopic_id = subtopic_result[0]
    else:
        subtopic_id = str(uuid.uuid4())
        cursor.execute(
            """
            INSERT INTO subtopics (id, name, description, "topicId", "updatedAt", "createdAt", "isActive", "currentCount", "targetQuestions")
            VALUES (%s, %s, %s, %s, NOW(), NOW(), true, 0, 0)
            RETURNING id
            """,
            (subtopic_id, subtopic_name, f"{subtopic_name} problems", topic_id)
        )
        # subtopic_id = cursor.fetchone()[0]
        print(f"Created subtopic: {subtopic_name}")
    
    cursor.close()
    return subtopic_id

def insert_question(question_type, question_data, image_data=None):
    """
    Insert a generated question into the database.
    """
    try:
        conn = get_db_connection()
        
        # Get category mapping
        mapping = CATEGORY_MAPPINGS.get(question_type)
        if not mapping:
            print(f"❌ Error: Unknown question type '{question_type}', skipping DB insertion")
            return False
        
        # Validate question_data has required fields
        if not question_data.get('question'):
            print(f"❌ Error: Missing 'question' field in question_data")
            return False
        
        if not question_data.get('choices') or len(question_data.get('choices', [])) != 4:
            print(f"❌ Error: Must have exactly 4 choices, got {len(question_data.get('choices', []))}")
            return False
        
        # Ensure topic/subtopic exist
        subtopic_id = ensure_topic_and_subtopic(
            conn, 
            mapping["moduleType"], 
            mapping["category"],
            mapping["subtopic"]
        )
        
        # Parse answer choices (remove "A) ", "B) " prefixes)
        options = [re.sub(r'^[A-D]\)\s*', '', choice) for choice in question_data.get('choices', [])]
        
        # Convert answer letter to index (A=0, B=1, etc.) with validation
        answer_letter = question_data.get('correct_answer', '').strip().upper()
        
        if not answer_letter:
            print(f"❌ Error: Missing 'correct_answer' field")
            return False
            
        if answer_letter == 'N/A':
            print(f"❌ Error: correct_answer is 'N/A', must be A, B, C, or D")
            return False
        
        # Handle cases where answer might be full text or index
        if len(answer_letter) == 1 and answer_letter in 'ABCD':
            correct_answer_index = ord(answer_letter) - ord('A')
        else:
            print(f"❌ Error: Invalid correct_answer '{answer_letter}', must be A, B, C, or D")
            return False
        
        # Validate index is within range
        if correct_answer_index < 0 or correct_answer_index > 3:
            print(f"❌ Error: correct_answer_index {correct_answer_index} out of range (0-3)")
            return False
        
        # Validate explanation exists
        explanation = question_data.get('explanation', '').strip()
        if not explanation:
            print(f"❌ Error: Missing or empty 'explanation' field")
            return False
        if len(explanation) < 300:
            difficulty = 'easy'
        elif len(explanation) > 600:
            difficulty = 'hard'
        else:
            difficulty = 'medium'
        
        # Prepare chart data
        chart_data = {
            "description": question_data.get('diagram_description'),
            "interactionType": "view-only",
            "hasDiagram": image_data is not None
        }
        
        # Insert question
        question_id = str(uuid.uuid4())
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO questions (
                id, "moduleType", difficulty, category, "subtopicId", subtopic,
                question, options, "correctAnswer", explanation,
                "chartData", "imageData", "imageMimeType", "imageAlt",
                "timeEstimate", source, tags, "isActive", "reviewStatus",
                "updatedAt", "createdAt"
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING id
            """,
            (
                question_id,
                mapping["moduleType"],
                difficulty,
                mapping["category"],
                subtopic_id,
                mapping["subtopic"],
                question_data.get('question', ''),
                Json(options),
                correct_answer_index,
                explanation,
                Json(chart_data),
                image_data,
                'image/png' if image_data else None,
                f"Diagram for: {question_data.get('question', '')[:60]}..." if image_data else None,
                90,  # Default time estimate
                f"AI Generated - {question_data.get('timestamp', 'unknown')}",
                [mapping["category"].lower(), mapping["subtopic"], difficulty],
                True,
                'pending'
            )
        )
        
        # question_id = cursor.fetchone()[0]
        conn.commit()
        cursor.close()
        conn.close()
        
        print(f"✅ Inserted question ID {question_id} into database")
        return True
        
    except Exception as e:
        print(f"❌ Database insertion failed: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False
