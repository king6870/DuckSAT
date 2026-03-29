"""
DuckSAT Template-Based Diagram Generator
=========================================
Generates matplotlib diagrams for existing questions using templates - NO API calls needed.
Analyzes question text to determine the appropriate diagram type, then renders it.

This is MUCH faster than AI-based generation (~0.1s per diagram vs ~10-30s).

Usage:
  python scripts/template_diagram_generator.py --count 200 --category geometry
  python scripts/template_diagram_generator.py --count 200 --category problem-solving-data-analysis
  python scripts/template_diagram_generator.py --count 200 --category advanced-math
  python scripts/template_diagram_generator.py --count 200 --category algebra
  python scripts/template_diagram_generator.py --count 1400 --all
  python scripts/template_diagram_generator.py --stats
"""

import json
import base64
import os
import sys
import re
import random
import argparse
import hashlib
from io import BytesIO
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import Arc, FancyArrowPatch
import numpy as np

# ─── Database Connection ─────────────────────────────────────────────────────
# We use pyodbc to connect directly to Azure SQL instead of going through Prisma

try:
    import pyodbc
    HAS_PYODBC = True
except ImportError:
    HAS_PYODBC = False
    print("⚠ pyodbc not installed. Will output JSON files for TS import instead.")

from dotenv import load_dotenv

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
OUTPUT_DIR = PROJECT_DIR / "generated-batches" / "diagram-batches"

for envfile in [PROJECT_DIR / ".env.local", PROJECT_DIR / ".env"]:
    if envfile.exists():
        load_dotenv(envfile)
        break

def get_db_connection():
    """Connect to Azure SQL using DATABASE_URL from .env.local"""
    db_url = os.environ.get("DATABASE_URL", "")
    if not db_url:
        raise ValueError("DATABASE_URL not set")
    
    # Parse sqlserver://user:pass@host:port;database=db;...
    # Format: sqlserver://host:port;database=NAME;user=USER;password=PASS;encrypt=true;trustServerCertificate=false
    parts = db_url.replace("sqlserver://", "")
    
    # Extract components
    host_port = parts.split(";")[0]
    host = host_port.split(":")[0] if ":" in host_port else host_port
    port = host_port.split(":")[1] if ":" in host_port else "1433"
    
    params = {}
    for part in parts.split(";")[1:]:
        if "=" in part:
            k, v = part.split("=", 1)
            params[k.strip().lower()] = v.strip()
    
    database = params.get("database", "DuckSAT_DB")
    user = params.get("user", "")
    password = params.get("password", "")
    
    conn_str = (
        f"DRIVER={{SQL Server}};"
        f"SERVER={host},{port};"
        f"DATABASE={database};"
        f"UID={user};"
        f"PWD={password};"
        f"Encrypt=yes;"
        f"TrustServerCertificate=no;"
    )
    
    return pyodbc.connect(conn_str, timeout=30)


# ─── Question Analysis ───────────────────────────────────────────────────────

def classify_diagram_type(question: str, category: str, subtopic: str) -> str:
    """Determine what type of diagram fits this question."""
    q = question.lower()
    
    if category == "geometry":
        if any(w in q for w in ["triangle", "△", "abc"]):
            return "triangle"
        if any(w in q for w in ["circle", "radius", "diameter", "circumference"]):
            return "circle"
        if any(w in q for w in ["rectangle", "square", "length", "width"]):
            return "rectangle"
        if any(w in q for w in ["angle", "degree", "parallel", "transversal", "perpendicular"]):
            return "angles"
        if any(w in q for w in ["coordinate", "point", "slope", "midpoint", "distance"]):
            return "coordinate"
        if any(w in q for w in ["transform", "reflect", "rotate", "translate"]):
            return "coordinate"
        if any(w in q for w in ["area", "perimeter", "volume"]):
            return "rectangle"
        return "triangle"  # default geometry
    
    if category == "problem-solving-data-analysis":
        if any(w in q for w in ["scatter", "correlation", "trend"]):
            return "scatter"
        if any(w in q for w in ["pie", "percent", "proportion", "sector"]):
            return "pie"
        if any(w in q for w in ["line graph", "over time", "increase", "decrease", "trend"]):
            return "line"
        if any(w in q for w in ["histogram", "distribution", "frequency"]):
            return "histogram"
        return "bar"  # default data analysis
    
    if category in ("advanced-math", "algebra"):
        if any(w in q for w in ["parabola", "quadratic", "x²", "x^2", "vertex"]):
            return "parabola"
        if any(w in q for w in ["exponential", "growth", "decay", "^x"]):
            return "exponential"
        if any(w in q for w in ["absolute", "|x|", "abs"]):
            return "absolute_value"
        if any(w in q for w in ["linear", "slope", "y = mx", "line"]):
            return "linear"
        if any(w in q for w in ["system", "intersection"]):
            return "system_of_equations"
        if any(w in q for w in ["polynomial", "cubic", "degree"]):
            return "polynomial"
        return "parabola"  # default math
    
    return "generic"


def extract_numbers(text: str) -> list:
    """Extract numbers from question text for use in diagrams."""
    nums = re.findall(r'(?<![a-zA-Z])(\d+(?:\.\d+)?)(?![a-zA-Z])', text)
    return [float(n) for n in nums[:10]]  # Limit to first 10


def seeded_random(question_id: str) -> random.Random:
    """Create a seeded random generator for reproducible diagrams."""
    seed = int(hashlib.md5(question_id.encode()).hexdigest()[:8], 16)
    return random.Random(seed)


# ─── Diagram Renderers ───────────────────────────────────────────────────────

def render_triangle(q_text: str, q_id: str) -> tuple[str, str, str]:
    """Render a triangle diagram."""
    rng = seeded_random(q_id)
    nums = extract_numbers(q_text)
    
    fig, ax = plt.subplots(figsize=(7, 7))
    
    # Determine triangle type from question
    q_lower = q_text.lower()
    
    if "right" in q_lower or "90" in q_text:
        # Right triangle
        a = nums[0] if nums else rng.randint(3, 8)
        b = nums[1] if len(nums) > 1 else rng.randint(4, 10)
        vertices = np.array([[0, 0], [a, 0], [0, b]])
        labels = ['A', 'B', 'C']
        # Right angle marker
        size = min(a, b) * 0.1
        ax.plot([size, size, 0], [0, size, size], 'k-', linewidth=1)
        # Side labels
        ax.text(a/2, -0.4, f'{a}', ha='center', fontsize=13, fontweight='bold')
        ax.text(-0.5, b/2, f'{b}', ha='center', fontsize=13, fontweight='bold', rotation=90)
        c = round((a**2 + b**2)**0.5, 1)
        ax.text(a/2 + 0.3, b/2 + 0.3, f'{c}', ha='center', fontsize=13, fontweight='bold', rotation=-55)
    elif "equilateral" in q_lower:
        s = nums[0] if nums else rng.randint(4, 10)
        h = s * (3**0.5) / 2
        vertices = np.array([[0, 0], [s, 0], [s/2, h]])
        labels = ['A', 'B', 'C']
        ax.text(s/2, -0.4, f'{s}', ha='center', fontsize=13, fontweight='bold')
        ax.text(-0.5, h/2, f'{s}', ha='center', fontsize=13, fontweight='bold')
        ax.text(s+0.3, h/2, f'{s}', ha='center', fontsize=13, fontweight='bold')
    elif "isosceles" in q_lower:
        base = nums[0] if nums else rng.randint(4, 10)
        side = nums[1] if len(nums) > 1 else base * rng.uniform(0.8, 1.5)
        h = (side**2 - (base/2)**2)**0.5 if side > base/2 else base * 0.8
        vertices = np.array([[0, 0], [base, 0], [base/2, h]])
        labels = ['A', 'B', 'C']
        ax.text(base/2, -0.4, f'{round(base,1)}', ha='center', fontsize=13, fontweight='bold')
        ax.text(-0.7, h/2, f'{round(side,1)}', ha='center', fontsize=13, fontweight='bold')
        ax.text(base+0.5, h/2, f'{round(side,1)}', ha='center', fontsize=13, fontweight='bold')
    else:
        # General triangle
        a = nums[0] if nums else rng.randint(3, 10)
        b = nums[1] if len(nums) > 1 else rng.randint(3, 10)
        angle = rng.uniform(40, 100)
        rad = np.radians(angle)
        vertices = np.array([[0, 0], [a, 0], [b * np.cos(rad), b * np.sin(rad)]])
        labels = ['A', 'B', 'C']
        ax.text(a/2, -0.4, f'{a}', ha='center', fontsize=13, fontweight='bold')
    
    # Draw triangle
    tri = plt.Polygon(vertices, fill=False, edgecolor='#2563eb', linewidth=2.5)
    ax.add_patch(tri)
    
    # Vertex labels
    offsets = [(-0.5, -0.5), (0.5, -0.5), (0, 0.5)]
    for i, (label, (x, y)) in enumerate(zip(labels, vertices)):
        ox, oy = offsets[i]
        ax.text(x + ox, y + oy, label, fontsize=16, fontweight='bold', 
                color='#1e40af', ha='center', va='center')
    
    ax.set_aspect('equal')
    ax.grid(True, alpha=0.15)
    ax.set_axisbelow(True)
    margin = max(np.ptp(vertices[:, 0]), np.ptp(vertices[:, 1])) * 0.2
    ax.set_xlim(vertices[:, 0].min() - margin - 1, vertices[:, 0].max() + margin + 1)
    ax.set_ylim(vertices[:, 1].min() - margin - 1, vertices[:, 1].max() + margin + 1)
    ax.set_title("Figure", fontsize=14, fontweight='bold', pad=12)
    ax.spines[['top', 'right']].set_visible(False)
    
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=150, facecolor='white')
    plt.close()
    buf.seek(0)
    
    return base64.b64encode(buf.getvalue()).decode(), "Triangle diagram", "geometry"


def render_circle(q_text: str, q_id: str) -> tuple[str, str, str]:
    """Render a circle diagram."""
    rng = seeded_random(q_id)
    nums = extract_numbers(q_text)
    r = nums[0] if nums else rng.randint(3, 8)
    
    fig, ax = plt.subplots(figsize=(7, 7))
    
    circle = plt.Circle((0, 0), r, fill=False, edgecolor='#2563eb', linewidth=2.5)
    ax.add_patch(circle)
    
    # Center
    ax.plot(0, 0, 'ko', markersize=5)
    ax.text(0.2, -0.3, 'O', fontsize=14, fontweight='bold', color='#1e40af')
    
    # Radius line
    angle = np.radians(rng.randint(20, 70))
    ax.plot([0, r*np.cos(angle)], [0, r*np.sin(angle)], 'k-', linewidth=2)
    ax.text(r*np.cos(angle)/2 + 0.3, r*np.sin(angle)/2 + 0.3, f'r = {r}',
            fontsize=13, fontweight='bold', color='#dc2626')
    
    # Point on circle
    ax.plot(r*np.cos(angle), r*np.sin(angle), 'ko', markersize=6)
    ax.text(r*np.cos(angle) + 0.3, r*np.sin(angle) + 0.3, 'P',
            fontsize=14, fontweight='bold', color='#1e40af')
    
    # Diameter if mentioned
    if "diameter" in q_text.lower():
        ax.plot([-r, r], [0, 0], 'k--', linewidth=1.5, alpha=0.5)
        ax.text(0, -0.5, f'd = {2*r}', fontsize=12, ha='center', color='#6b7280')
    
    ax.set_aspect('equal')
    ax.grid(True, alpha=0.15)
    ax.set_xlim(-r - 2, r + 2)
    ax.set_ylim(-r - 2, r + 2)
    ax.set_title("Figure", fontsize=14, fontweight='bold', pad=12)
    ax.spines[['top', 'right']].set_visible(False)
    
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=150, facecolor='white')
    plt.close()
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode(), "Circle diagram", "geometry"


def render_rectangle(q_text: str, q_id: str) -> tuple[str, str, str]:
    """Render a rectangle/square diagram."""
    rng = seeded_random(q_id)
    nums = extract_numbers(q_text)
    
    w = nums[0] if nums else rng.randint(4, 12)
    h = nums[1] if len(nums) > 1 else (w if "square" in q_text.lower() else rng.randint(3, 10))
    
    fig, ax = plt.subplots(figsize=(8, 6))
    
    rect = patches.Rectangle((0, 0), w, h, fill=False, edgecolor='#2563eb', linewidth=2.5)
    ax.add_patch(rect)
    
    # Labels
    ax.text(w/2, -0.5, f'{w}', ha='center', fontsize=14, fontweight='bold', color='#dc2626')
    ax.text(-0.7, h/2, f'{h}', ha='center', fontsize=14, fontweight='bold', color='#dc2626', rotation=90)
    
    # Vertices
    for label, (x, y), (ox, oy) in [
        ('A', (0, 0), (-0.5, -0.5)),
        ('B', (w, 0), (0.5, -0.5)),
        ('C', (w, h), (0.5, 0.5)),
        ('D', (0, h), (-0.5, 0.5)),
    ]:
        ax.text(x + ox, y + oy, label, fontsize=15, fontweight='bold', color='#1e40af')
    
    # Right angle markers
    s = min(w, h) * 0.06
    for cx, cy in [(0, 0), (w, 0), (w, h), (0, h)]:
        ax.plot([cx + s * (1 if cx == 0 else -1), cx + s * (1 if cx == 0 else -1), cx],
                [cy, cy + s * (1 if cy == 0 else -1), cy + s * (1 if cy == 0 else -1)],
                'k-', linewidth=1)
    
    ax.set_aspect('equal')
    ax.grid(True, alpha=0.15)
    ax.set_xlim(-1.5, w + 1.5)
    ax.set_ylim(-1.5, h + 1.5)
    ax.set_title("Figure", fontsize=14, fontweight='bold', pad=12)
    ax.spines[['top', 'right']].set_visible(False)
    
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=150, facecolor='white')
    plt.close()
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode(), "Rectangle diagram", "geometry"


def render_angles(q_text: str, q_id: str) -> tuple[str, str, str]:
    """Render parallel lines with angles or angle measurement."""
    rng = seeded_random(q_id)
    nums = extract_numbers(q_text)
    angle_val = nums[0] if nums and nums[0] < 180 else rng.randint(30, 150)
    
    fig, ax = plt.subplots(figsize=(8, 6))
    
    q_lower = q_text.lower()
    if "parallel" in q_lower or "transversal" in q_lower:
        # Two parallel lines with transversal
        ax.plot([-4, 6], [2, 2], 'b-', linewidth=2.5)
        ax.plot([-4, 6], [-1, -1], 'b-', linewidth=2.5)
        
        # Transversal
        slope = np.tan(np.radians(angle_val))
        ax.plot([-2, 4], [-1 - 2*slope, -1 + 4*slope], 'r-', linewidth=2)
        
        # Labels
        ax.text(6.3, 2, 'l₁', fontsize=14, fontweight='bold', color='#2563eb')
        ax.text(6.3, -1, 'l₂', fontsize=14, fontweight='bold', color='#2563eb')
        ax.text(4.3, -1 + 4*slope + 0.2, 't', fontsize=14, fontweight='bold', color='#dc2626')
        
        # Angle arc
        arc = Arc((1, 2), 1.5, 1.5, angle=0, theta1=0, theta2=angle_val, color='green', linewidth=2)
        ax.add_patch(arc)
        ax.text(2.2, 2.5, f'{int(angle_val)}°', fontsize=13, fontweight='bold', color='#16a34a')
    
    else:
        # Simple angle measurement
        ax.plot([0, 5], [0, 0], 'b-', linewidth=2.5)
        rad = np.radians(angle_val)
        ax.plot([0, 5*np.cos(rad)], [0, 5*np.sin(rad)], 'b-', linewidth=2.5)
        
        arc = Arc((0, 0), 2, 2, angle=0, theta1=0, theta2=angle_val, color='#dc2626', linewidth=2)
        ax.add_patch(arc)
        ax.text(1.5*np.cos(np.radians(angle_val/2)), 
                1.5*np.sin(np.radians(angle_val/2)), 
                f'{int(angle_val)}°', fontsize=14, fontweight='bold', color='#dc2626')
        
        ax.plot(0, 0, 'ko', markersize=5)
        ax.text(-0.3, -0.4, 'O', fontsize=14, fontweight='bold', color='#1e40af')
    
    ax.set_aspect('equal')
    ax.grid(True, alpha=0.15)
    ax.autoscale()
    margin = 1.5
    xl, xr = ax.get_xlim()
    yl, yr = ax.get_ylim()
    ax.set_xlim(xl - margin, xr + margin)
    ax.set_ylim(yl - margin, yr + margin)
    ax.set_title("Figure", fontsize=14, fontweight='bold', pad=12)
    ax.spines[['top', 'right']].set_visible(False)
    
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=150, facecolor='white')
    plt.close()
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode(), "Angle diagram", "geometry"


def render_coordinate(q_text: str, q_id: str) -> tuple[str, str, str]:
    """Render a coordinate plane with points/lines."""
    rng = seeded_random(q_id)
    nums = extract_numbers(q_text)
    
    fig, ax = plt.subplots(figsize=(8, 8))
    
    # Coordinate axes
    ax.axhline(y=0, color='k', linewidth=1.5)
    ax.axvline(x=0, color='k', linewidth=1.5)
    ax.grid(True, alpha=0.3)
    
    # Generate some points
    points = []
    if len(nums) >= 4:
        for i in range(0, min(len(nums), 8), 2):
            points.append((nums[i], nums[i+1] if i+1 < len(nums) else 0))
    else:
        n_pts = rng.randint(2, 4)
        for _ in range(n_pts):
            points.append((rng.randint(-5, 5), rng.randint(-5, 5)))
    
    colors = ['#dc2626', '#2563eb', '#16a34a', '#9333ea']
    letters = 'ABCDEFGH'
    
    for i, (x, y) in enumerate(points):
        ax.plot(x, y, 'o', color=colors[i % len(colors)], markersize=10, zorder=5)
        ax.annotate(f'{letters[i]}({int(x)},{int(y)})', (x, y), 
                    textcoords="offset points", xytext=(10, 10),
                    fontsize=12, fontweight='bold', color=colors[i % len(colors)])
    
    # Draw line between first two points
    if len(points) >= 2:
        xs = [p[0] for p in points[:2]]
        ys = [p[1] for p in points[:2]]
        ax.plot(xs, ys, '--', color='#6b7280', linewidth=1.5, alpha=0.6)
    
    lim = max(abs(p) for pt in points for p in pt) + 3
    ax.set_xlim(-lim, lim)
    ax.set_ylim(-lim, lim)
    ax.set_xlabel('x', fontsize=13, fontweight='bold')
    ax.set_ylabel('y', fontsize=13, fontweight='bold')
    ax.set_title("Coordinate Plane", fontsize=14, fontweight='bold', pad=12)
    
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=150, facecolor='white')
    plt.close()
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode(), "Coordinate plane", "geometry"


def render_bar_chart(q_text: str, q_id: str) -> tuple[str, str, str]:
    """Render a bar chart for data analysis questions."""
    rng = seeded_random(q_id)
    nums = extract_numbers(q_text)
    
    fig, ax = plt.subplots(figsize=(9, 6))
    
    # Try to extract categories from text
    q_lower = q_text.lower()
    
    category_sets = [
        (['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], 'Day of the Week'),
        (['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], 'Month'),
        (['Math', 'Science', 'English', 'History', 'Art'], 'Subject'),
        (['Q1', 'Q2', 'Q3', 'Q4'], 'Quarter'),
        (['Store A', 'Store B', 'Store C', 'Store D', 'Store E'], 'Store'),
        (['2020', '2021', '2022', '2023', '2024'], 'Year'),
    ]
    
    cats, xlabel = category_sets[rng.randint(0, len(category_sets) - 1)]
    n = len(cats)
    
    # Use numbers from text if available, otherwise generate
    if len(nums) >= n:
        values = [nums[i] for i in range(n)]
    else:
        base = rng.randint(20, 80)
        values = [base + rng.randint(-20, 30) for _ in range(n)]
    
    colors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#2563eb', '#1d4ed8']
    bars = ax.bar(cats, values, color=colors[:n], edgecolor='white', linewidth=1.5)
    
    # Value labels on bars
    for bar, val in zip(bars, values):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + max(values)*0.02,
                f'{int(val)}', ha='center', fontsize=12, fontweight='bold')
    
    ax.set_xlabel(xlabel, fontsize=13, fontweight='bold')
    ax.set_ylabel('Value', fontsize=13, fontweight='bold')
    
    # Generate a title based on question context
    titles = ['Survey Results', 'Sales Data', 'Student Scores', 'Quarterly Report',
              'Population Data', 'Budget Analysis', 'Performance Metrics']
    ax.set_title(titles[rng.randint(0, len(titles) - 1)], fontsize=14, fontweight='bold', pad=12)
    ax.grid(axis='y', alpha=0.3)
    ax.spines[['top', 'right']].set_visible(False)
    ax.set_ylim(0, max(values) * 1.2)
    
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=150, facecolor='white')
    plt.close()
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode(), "Bar chart", "bar-chart"


def render_scatter(q_text: str, q_id: str) -> tuple[str, str, str]:
    """Render a scatter plot."""
    rng = seeded_random(q_id)
    
    fig, ax = plt.subplots(figsize=(8, 6))
    
    n_points = rng.randint(10, 20)
    # Generate correlated data
    corr = rng.choice([0.7, 0.8, 0.9, -0.6, -0.8])
    x = np.array([rng.uniform(1, 10) for _ in range(n_points)])
    noise = np.array([rng.gauss(0, 1.5) for _ in range(n_points)])
    y = corr * x * 5 + (1 - abs(corr)) * noise * 10 + rng.uniform(10, 30)
    
    ax.scatter(x, y, c='#3b82f6', s=80, alpha=0.7, edgecolors='white', linewidth=1)
    
    # Best fit line
    m, b = np.polyfit(x, y, 1)
    x_fit = np.linspace(min(x) - 0.5, max(x) + 0.5, 100)
    ax.plot(x_fit, m * x_fit + b, 'r--', linewidth=2, alpha=0.7, label=f'y = {m:.1f}x + {b:.1f}')
    
    ax.legend(fontsize=12)
    xlabels = ['Study Hours', 'Temperature (°F)', 'Price ($)', 'Age', 'Distance (miles)']
    ylabels = ['Test Score', 'Sales', 'Quantity', 'Height (cm)', 'Time (min)']
    idx = rng.randint(0, len(xlabels) - 1)
    ax.set_xlabel(xlabels[idx], fontsize=13, fontweight='bold')
    ax.set_ylabel(ylabels[idx], fontsize=13, fontweight='bold')
    ax.set_title('Data Analysis', fontsize=14, fontweight='bold', pad=12)
    ax.grid(True, alpha=0.3)
    ax.spines[['top', 'right']].set_visible(False)
    
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=150, facecolor='white')
    plt.close()
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode(), "Scatter plot", "scatter-plot"


def render_pie(q_text: str, q_id: str) -> tuple[str, str, str]:
    """Render a pie chart."""
    rng = seeded_random(q_id)
    nums = extract_numbers(q_text)
    
    fig, ax = plt.subplots(figsize=(8, 8))
    
    label_sets = [
        ['Housing', 'Food', 'Transport', 'Entertainment', 'Savings'],
        ['Math', 'Science', 'English', 'History', 'Other'],
        ['Product A', 'Product B', 'Product C', 'Product D'],
        ['Freshman', 'Sophomore', 'Junior', 'Senior'],
    ]
    
    labels = label_sets[rng.randint(0, len(label_sets) - 1)]
    n = len(labels)
    
    if len(nums) >= n and sum(nums[:n]) > 0:
        values = [nums[i] for i in range(n)]
    else:
        values = [rng.randint(10, 40) for _ in range(n)]
    
    total = sum(values)
    pcts = [v/total * 100 for v in values]
    
    colors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4']
    explode = [0.03] * n
    explode[0] = 0.08  # Emphasize first slice
    
    wedges, texts, autotexts = ax.pie(
        values, labels=labels, autopct='%1.1f%%', colors=colors[:n],
        explode=explode, startangle=90, textprops={'fontsize': 12}
    )
    for t in autotexts:
        t.set_fontweight('bold')
    
    titles = ['Budget Allocation', 'Grade Distribution', 'Market Share', 'Survey Results']
    ax.set_title(titles[rng.randint(0, len(titles) - 1)], fontsize=14, fontweight='bold', pad=12)
    
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=150, facecolor='white')
    plt.close()
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode(), "Pie chart", "pie-chart"


def render_line(q_text: str, q_id: str) -> tuple[str, str, str]:
    """Render a line graph."""
    rng = seeded_random(q_id)
    
    fig, ax = plt.subplots(figsize=(9, 6))
    
    x_labels = [str(2018 + i) for i in range(7)]
    n = len(x_labels)
    
    base = rng.randint(50, 200)
    growth = rng.uniform(-5, 15)
    values = [base + growth * i + rng.gauss(0, 10) for i in range(n)]
    
    ax.plot(x_labels, values, 'o-', color='#3b82f6', linewidth=2.5, markersize=8, markerfacecolor='white', markeredgewidth=2)
    
    for i, (x, y) in enumerate(zip(x_labels, values)):
        ax.annotate(f'{int(y)}', (x, y), textcoords="offset points", xytext=(0, 12),
                    ha='center', fontsize=11, fontweight='bold', color='#1e40af')
    
    ylabels = ['Revenue ($K)', 'Students', 'Population', 'Temperature (°F)', 'Visitors']
    idx = rng.randint(0, len(ylabels) - 1)
    ax.set_xlabel('Year', fontsize=13, fontweight='bold')
    ax.set_ylabel(ylabels[idx], fontsize=13, fontweight='bold')
    ax.set_title('Trend Over Time', fontsize=14, fontweight='bold', pad=12)
    ax.grid(True, alpha=0.3)
    ax.spines[['top', 'right']].set_visible(False)
    
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=150, facecolor='white')
    plt.close()
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode(), "Line graph", "line-graph"


def render_histogram(q_text: str, q_id: str) -> tuple[str, str, str]:
    """Render a histogram."""
    rng = seeded_random(q_id)
    
    fig, ax = plt.subplots(figsize=(8, 6))
    
    mu = rng.uniform(60, 80)
    sigma = rng.uniform(8, 15)
    data = [rng.gauss(mu, sigma) for _ in range(200)]
    
    ax.hist(data, bins=15, color='#3b82f6', edgecolor='white', linewidth=1.2, alpha=0.8)
    ax.axvline(np.mean(data), color='#dc2626', linewidth=2, linestyle='--', label=f'Mean = {np.mean(data):.1f}')
    
    ax.legend(fontsize=12)
    ax.set_xlabel('Score', fontsize=13, fontweight='bold')
    ax.set_ylabel('Frequency', fontsize=13, fontweight='bold')
    ax.set_title('Score Distribution', fontsize=14, fontweight='bold', pad=12)
    ax.grid(axis='y', alpha=0.3)
    ax.spines[['top', 'right']].set_visible(False)
    
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=150, facecolor='white')
    plt.close()
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode(), "Histogram", "bar-chart"


def render_parabola(q_text: str, q_id: str) -> tuple[str, str, str]:
    """Render a parabola/quadratic function."""
    rng = seeded_random(q_id)
    nums = extract_numbers(q_text)
    
    fig, ax = plt.subplots(figsize=(8, 8))
    
    a = nums[0] if nums and abs(nums[0]) <= 5 and nums[0] != 0 else rng.choice([-2, -1, 1, 2])
    h = nums[1] if len(nums) > 1 and abs(nums[1]) <= 5 else rng.randint(-3, 3)
    k = nums[2] if len(nums) > 2 and abs(nums[2]) <= 10 else rng.randint(-4, 4)
    
    x = np.linspace(h - 5, h + 5, 200)
    y = a * (x - h)**2 + k
    
    ax.axhline(y=0, color='k', linewidth=1)
    ax.axvline(x=0, color='k', linewidth=1)
    ax.grid(True, alpha=0.3)
    
    ax.plot(x, y, '#2563eb', linewidth=2.5)
    
    # Vertex
    ax.plot(h, k, 'ro', markersize=8, zorder=5)
    ax.annotate(f'Vertex ({h},{k})', (h, k), textcoords="offset points",
                xytext=(15, -15), fontsize=12, fontweight='bold', color='#dc2626')
    
    # X-intercepts (if real)
    disc = -k/a if a != 0 else 0
    if disc >= 0:
        x1 = h - disc**0.5
        x2 = h + disc**0.5
        ax.plot([x1, x2], [0, 0], 'go', markersize=8, zorder=5)
        ax.annotate(f'({x1:.1f}, 0)', (x1, 0), textcoords="offset points",
                    xytext=(-10, 10), fontsize=11, color='#16a34a')
        ax.annotate(f'({x2:.1f}, 0)', (x2, 0), textcoords="offset points",
                    xytext=(5, 10), fontsize=11, color='#16a34a')
    
    ax.set_xlabel('x', fontsize=13, fontweight='bold')
    ax.set_ylabel('y', fontsize=13, fontweight='bold')
    sign_a = '' if a == 1 else ('-' if a == -1 else str(a))
    ax.set_title(f'y = {sign_a}(x - {h})² + {k}', fontsize=14, fontweight='bold', pad=12)
    
    y_range = max(abs(y.max()), abs(y.min()), 8)
    ax.set_ylim(-y_range, y_range)
    
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=150, facecolor='white')
    plt.close()
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode(), "Parabola graph", "function-graph"


def render_linear(q_text: str, q_id: str) -> tuple[str, str, str]:
    """Render a linear function graph."""
    rng = seeded_random(q_id)
    nums = extract_numbers(q_text)
    
    fig, ax = plt.subplots(figsize=(8, 8))
    
    m = nums[0] if nums and abs(nums[0]) <= 10 else rng.choice([-3, -2, -1, 0.5, 1, 2, 3])
    b = nums[1] if len(nums) > 1 and abs(nums[1]) <= 10 else rng.randint(-5, 5)
    
    x = np.linspace(-8, 8, 200)
    y = m * x + b
    
    ax.axhline(y=0, color='k', linewidth=1)
    ax.axvline(x=0, color='k', linewidth=1)
    ax.grid(True, alpha=0.3)
    
    ax.plot(x, y, '#2563eb', linewidth=2.5)
    
    # Y-intercept
    ax.plot(0, b, 'ro', markersize=8, zorder=5)
    ax.annotate(f'(0, {b})', (0, b), textcoords="offset points",
                xytext=(10, 10), fontsize=12, fontweight='bold', color='#dc2626')
    
    # X-intercept
    if m != 0:
        xi = -b/m
        ax.plot(xi, 0, 'go', markersize=8, zorder=5)
        ax.annotate(f'({xi:.1f}, 0)', (xi, 0), textcoords="offset points",
                    xytext=(10, -15), fontsize=12, color='#16a34a')
    
    ax.set_xlabel('x', fontsize=13, fontweight='bold')
    ax.set_ylabel('y', fontsize=13, fontweight='bold')
    ax.set_title(f'y = {m}x + {b}', fontsize=14, fontweight='bold', pad=12)
    ax.set_xlim(-8, 8)
    ax.set_ylim(-10, 10)
    
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=150, facecolor='white')
    plt.close()
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode(), "Linear function graph", "function-graph"


def render_exponential(q_text: str, q_id: str) -> tuple[str, str, str]:
    """Render an exponential function graph."""
    rng = seeded_random(q_id)
    
    fig, ax = plt.subplots(figsize=(8, 8))
    
    base_val = rng.choice([1.5, 2, 2.5, 3])
    a = rng.choice([1, 2])
    
    x = np.linspace(-3, 4, 200)
    y = a * base_val**x
    
    ax.axhline(y=0, color='k', linewidth=1)
    ax.axvline(x=0, color='k', linewidth=1)
    ax.grid(True, alpha=0.3)
    
    ax.plot(x, y, '#2563eb', linewidth=2.5)
    
    # Key points
    ax.plot(0, a, 'ro', markersize=8, zorder=5)
    ax.annotate(f'(0, {a})', (0, a), textcoords="offset points",
                xytext=(10, 10), fontsize=12, fontweight='bold', color='#dc2626')
    ax.plot(1, a*base_val, 'go', markersize=8, zorder=5)
    ax.annotate(f'(1, {a*base_val:.1f})', (1, a*base_val), textcoords="offset points",
                xytext=(10, 10), fontsize=12, color='#16a34a')
    
    # Asymptote
    ax.axhline(y=0, color='#f59e0b', linewidth=1.5, linestyle='--', alpha=0.5)
    ax.text(3, 1, 'y = 0 (asymptote)', fontsize=11, color='#f59e0b')
    
    ax.set_xlabel('x', fontsize=13, fontweight='bold')
    ax.set_ylabel('y', fontsize=13, fontweight='bold')
    ax.set_title(f'y = {a}·{base_val}ˣ', fontsize=14, fontweight='bold', pad=12)
    ax.set_ylim(-2, min(y.max(), 50))
    
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=150, facecolor='white')
    plt.close()
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode(), "Exponential function graph", "function-graph"


def render_absolute_value(q_text: str, q_id: str) -> tuple[str, str, str]:
    """Render absolute value function."""
    rng = seeded_random(q_id)
    
    fig, ax = plt.subplots(figsize=(8, 8))
    
    h = rng.randint(-3, 3)
    k = rng.randint(-3, 3)
    a = rng.choice([-2, -1, 1, 2])
    
    x = np.linspace(h - 6, h + 6, 400)
    y = a * np.abs(x - h) + k
    
    ax.axhline(y=0, color='k', linewidth=1)
    ax.axvline(x=0, color='k', linewidth=1)
    ax.grid(True, alpha=0.3)
    
    ax.plot(x, y, '#2563eb', linewidth=2.5)
    ax.plot(h, k, 'ro', markersize=8, zorder=5)
    ax.annotate(f'Vertex ({h},{k})', (h, k), textcoords="offset points",
                xytext=(15, -15), fontsize=12, fontweight='bold', color='#dc2626')
    
    ax.set_xlabel('x', fontsize=13, fontweight='bold')
    ax.set_ylabel('y', fontsize=13, fontweight='bold')
    ax.set_title(f'y = {a}|x - {h}| + {k}', fontsize=14, fontweight='bold', pad=12)
    ax.set_xlim(h - 6, h + 6)
    ax.set_ylim(k - 6, k + 6)
    
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=150, facecolor='white')
    plt.close()
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode(), "Absolute value graph", "function-graph"


def render_system_of_equations(q_text: str, q_id: str) -> tuple[str, str, str]:
    """Render system of equations (two lines)."""
    rng = seeded_random(q_id)
    
    fig, ax = plt.subplots(figsize=(8, 8))
    
    m1 = rng.choice([-2, -1, 0.5, 1, 2])
    b1 = rng.randint(-3, 3)
    m2 = rng.choice([-2, -1, 0.5, 1, 2])
    while abs(m2 - m1) < 0.3:
        m2 = rng.choice([-2, -1, 0.5, 1, 2])
    b2 = rng.randint(-3, 3)
    
    x = np.linspace(-8, 8, 200)
    y1 = m1 * x + b1
    y2 = m2 * x + b2
    
    ax.axhline(y=0, color='k', linewidth=1)
    ax.axvline(x=0, color='k', linewidth=1)
    ax.grid(True, alpha=0.3)
    
    ax.plot(x, y1, '#2563eb', linewidth=2.5, label=f'y = {m1}x + {b1}')
    ax.plot(x, y2, '#dc2626', linewidth=2.5, label=f'y = {m2}x + {b2}')
    
    # Intersection
    if m1 != m2:
        xi = (b2 - b1) / (m1 - m2)
        yi = m1 * xi + b1
        ax.plot(xi, yi, 'ko', markersize=10, zorder=5)
        ax.annotate(f'({xi:.1f}, {yi:.1f})', (xi, yi), textcoords="offset points",
                    xytext=(10, 10), fontsize=12, fontweight='bold',
                    bbox=dict(boxstyle='round,pad=0.3', facecolor='yellow', alpha=0.7))
    
    ax.legend(fontsize=12)
    ax.set_xlabel('x', fontsize=13, fontweight='bold')
    ax.set_ylabel('y', fontsize=13, fontweight='bold')
    ax.set_title("System of Equations", fontsize=14, fontweight='bold', pad=12)
    ax.set_xlim(-8, 8)
    ax.set_ylim(-10, 10)
    
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=150, facecolor='white')
    plt.close()
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode(), "System of equations graph", "function-graph"


def render_polynomial(q_text: str, q_id: str) -> tuple[str, str, str]:
    """Render a polynomial function."""
    rng = seeded_random(q_id)
    
    fig, ax = plt.subplots(figsize=(8, 8))
    
    roots = sorted([rng.randint(-4, 4) for _ in range(3)])
    x = np.linspace(min(roots) - 2, max(roots) + 2, 400)
    y = np.prod([x - r for r in roots], axis=0)
    y = y / max(abs(y.max()), abs(y.min())) * 10  # Normalize
    
    ax.axhline(y=0, color='k', linewidth=1)
    ax.axvline(x=0, color='k', linewidth=1)
    ax.grid(True, alpha=0.3)
    
    ax.plot(x, y, '#2563eb', linewidth=2.5)
    
    for r in roots:
        ax.plot(r, 0, 'ro', markersize=8, zorder=5)
    
    ax.set_xlabel('x', fontsize=13, fontweight='bold')
    ax.set_ylabel('y', fontsize=13, fontweight='bold')
    ax.set_title('f(x)', fontsize=14, fontweight='bold', pad=12)
    ax.set_ylim(-12, 12)
    
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight', dpi=150, facecolor='white')
    plt.close()
    buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode(), "Polynomial graph", "function-graph"


def render_generic(q_text: str, q_id: str) -> tuple[str, str, str]:
    """Generic diagram fallback."""
    rng = seeded_random(q_id)
    
    # Try to pick the best renderer
    q_lower = q_text.lower()
    if any(w in q_lower for w in ['graph', 'plot', 'function', 'equation']):
        return render_linear(q_text, q_id)
    if any(w in q_lower for w in ['data', 'survey', 'table', 'count']):
        return render_bar_chart(q_text, q_id)
    return render_coordinate(q_text, q_id)


# ─── Renderer Map ─────────────────────────────────────────────────────────────

RENDERERS = {
    "triangle": render_triangle,
    "circle": render_circle,
    "rectangle": render_rectangle,
    "angles": render_angles,
    "coordinate": render_coordinate,
    "bar": render_bar_chart,
    "scatter": render_scatter,
    "pie": render_pie,
    "line": render_line,
    "histogram": render_histogram,
    "parabola": render_parabola,
    "linear": render_linear,
    "exponential": render_exponential,
    "absolute_value": render_absolute_value,
    "system_of_equations": render_system_of_equations,
    "polynomial": render_polynomial,
    "generic": render_generic,
}


def generate_diagram(question: str, category: str, subtopic: str, question_id: str) -> tuple[str, str, str] | None:
    """Generate a diagram for a question. Returns (base64, description, visualType) or None."""
    try:
        dtype = classify_diagram_type(question, category, subtopic or "")
        renderer = RENDERERS.get(dtype, render_generic)
        return renderer(question, question_id)
    except Exception as e:
        print(f"  ⚠ Render error: {e}")
        return None


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Template-based diagram generator")
    parser.add_argument("--count", type=int, default=100, help="Questions to process")
    parser.add_argument("--category", type=str, help="Filter by category")
    parser.add_argument("--all", action="store_true", help="Process all visual categories")
    parser.add_argument("--stats", action="store_true", help="Show current DB stats only")
    parser.add_argument("--output-json", action="store_true", help="Output JSON instead of updating DB")
    
    args = parser.parse_args()
    
    if not HAS_PYODBC:
        print("❌ pyodbc required. Install: pip install pyodbc")
        print("   Or use --output-json to generate JSON files for TS import.")
        if not args.output_json:
            sys.exit(1)
    
    conn = get_db_connection() if HAS_PYODBC else None
    cursor = conn.cursor() if conn else None
    
    if args.stats:
        cursor.execute("SELECT COUNT(*) FROM questions WHERE isActive = 1")
        total = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM questions WHERE isActive = 1 AND imageData IS NOT NULL")
        with_diagrams = cursor.fetchone()[0]
        pct = with_diagrams / total * 100 if total > 0 else 0
        print(f"\n📊 Database Stats:")
        print(f"   Total active: {total}")
        print(f"   With diagrams: {with_diagrams} ({pct:.1f}%)")
        print(f"   Target (25%): {int(total * 0.25)}")
        print(f"   Remaining: {max(0, int(total * 0.25) - with_diagrams)}")
        conn.close()
        return
    
    # Get questions without diagrams
    categories = ['geometry', 'problem-solving-data-analysis', 'advanced-math', 'algebra']
    if args.category:
        categories = [args.category]
    
    cat_placeholders = ','.join(['?' for _ in categories])
    
    cursor.execute(f"""
        SELECT TOP (?) id, question, category, subtopic, difficulty
        FROM questions
        WHERE isActive = 1 
          AND imageData IS NULL 
          AND category IN ({cat_placeholders})
        ORDER BY NEWID()
    """, [args.count] + categories)
    
    rows = cursor.fetchall()
    print(f"\n🖼️  Template Diagram Generator")
    print(f"{'═' * 50}")
    print(f"   Found {len(rows)} questions without diagrams")
    cats_in_scope = args.category or 'all visual'
    print(f"   Categories: {cats_in_scope}")
    print()
    
    success = 0
    failed = 0
    json_output = []
    
    for i, row in enumerate(rows):
        qid, question, category, subtopic, difficulty = row
        dtype = classify_diagram_type(question, category, subtopic or "")
        
        result = generate_diagram(question, category, subtopic or "", qid)
        if not result:
            failed += 1
            print(f"  [{i+1}/{len(rows)}] ✗ {category}/{subtopic}")
            continue
        
        img_b64, desc, visual_type = result
        
        if args.output_json:
            json_output.append({
                "id": qid,
                "imageBase64": img_b64,
                "imageMimeType": "image/png",
                "imageAlt": desc,
                "visualType": visual_type,
            })
        else:
            img_bytes = base64.b64decode(img_b64)
            cursor.execute("""
                UPDATE questions 
                SET imageData = ?, imageMimeType = ?, imageAlt = ?, visualType = ?
                WHERE id = ?
            """, [img_bytes, 'image/png', desc[:500], visual_type, qid])
        
        success += 1
        if (i + 1) % 50 == 0 or i == 0:
            print(f"  [{i+1}/{len(rows)}] ✓ {category}/{dtype} ({visual_type})")
        
        if not args.output_json and (i + 1) % 100 == 0:
            conn.commit()
            print(f"     💾 Committed {success} updates...")
    
    if not args.output_json and conn:
        conn.commit()
    
    if args.output_json and json_output:
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        outfile = OUTPUT_DIR / f"template-diagrams-{int(__import__('time').time())}.json"
        with open(outfile, 'w') as f:
            json.dump(json_output, f)
        print(f"\n💾 Saved {len(json_output)} diagram updates to {outfile}")
    
    # Final stats
    if conn:
        cursor.execute("SELECT COUNT(*) FROM questions WHERE isActive = 1")
        total = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM questions WHERE isActive = 1 AND imageData IS NOT NULL")
        with_diagrams = cursor.fetchone()[0]
        pct = with_diagrams / total * 100 if total > 0 else 0
        
        print(f"\n{'═' * 50}")
        print(f"📊 RESULTS")
        print(f"   Added diagrams: {success}")
        print(f"   Failed: {failed}")
        print(f"\n📈 DATABASE:")
        print(f"   Total: {total}")
        print(f"   With diagrams: {with_diagrams} ({pct:.1f}%)")
        print(f"   Target (25%): {int(total * 0.25)}")
        print(f"   Remaining: {max(0, int(total * 0.25) - with_diagrams)}")
        
        conn.close()


if __name__ == "__main__":
    main()
