
import sys
import base64
from io import BytesIO
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

try:
    buffer = None
    code = "buffer = BytesIO()\\nfig, ax = plt.subplots(figsize=(8, 8))\\nax.set_aspect('equal')\\nax.axhline(0, color='black', linewidth=1)\\nax.axvline(0, color='gray', linewidth=0.5)\\nA = (-2, 3)\\nAprime = (-2, -3)\\nax.scatter(A[0], A[1], color='steelblue', s=120, zorder=3)\\nax.scatter(Aprime[0], Aprime[1], color='tomato', s=120, zorder=3, marker='D')\\nax.text(A[0]-0.6, A[1]+0.6, 'A(-2, 3)', fontsize=14)\\nax.text(Aprime[0]-0.6, Aprime[1]-0.6, \\\"A'(-2, -3)\\\", fontsize=14)\\nax.plot([A[0], Aprime[0]], [A[1], Aprime[1]], linestyle='--', color='gray', linewidth=1)\\nax.set_xlabel('x', fontsize=14)\\nax.set_ylabel('y', fontsize=14)\\nax.set_xlim(-5, 5)\\nax.set_ylim(-5, 5)\\nax.set_title('Reflection of A(-2, 3) across the x-axis', fontsize=16)\\nax.grid(True, linestyle=':', color='lightgray', alpha=0.8)\\nplt.tight_layout()\\nplt.savefig(buffer, format='png', bbox_inches='tight', dpi=150, facecolor='white')\\nplt.close()"
    # Safety: remove dangerous calls
    safe_lines = []
    for line in code.splitlines():
        if any(bad in line for bad in ['plt.show', 'input(', 'os.system', 'subprocess', 'exec(', 'eval(']):
            safe_lines.append('# ' + line)
        else:
            safe_lines.append(line)
    safe_code = '\n'.join(safe_lines)
    
    exec_globals = {'BytesIO': BytesIO, 'plt': plt, 'np': np, 'matplotlib': matplotlib}
    exec(safe_code, exec_globals)
    
    buf = exec_globals.get('buffer')
    if buf is None:
        for v in exec_globals.values():
            if isinstance(v, BytesIO):
                buf = v
                break
    
    if buf is None:
        print("ERROR: No buffer found", file=sys.stderr)
        sys.exit(1)
    
    buf.seek(0)
    data = buf.getvalue()
    if len(data) < 100:
        print("ERROR: Empty image", file=sys.stderr)
        sys.exit(1)
    
    b64 = base64.b64encode(data).decode('ascii')
    with open("D:\\DuckSAT\\generated-batches\\diagram-batches\\.temp\\output_cmmpnrox200rvuiv1ojys9dmc.txt", 'w') as f:
        f.write(b64)
    print("OK")
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)
finally:
    plt.close('all')
