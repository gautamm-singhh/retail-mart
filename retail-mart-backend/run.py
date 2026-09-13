import os
import sys
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
INNER_DIR = os.path.join(BASE_DIR, "retail-mart-backend")

# Ensure inner directory containing app package is in sys.path
for path in (INNER_DIR, BASE_DIR):
    if path not in sys.path:
        sys.path.insert(0, path)

load_dotenv(os.path.join(INNER_DIR, ".env"), override=True)
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

from app import create_app

app = create_app(os.environ.get("FLASK_ENV", "development"))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 4000))
    app.run(host="0.0.0.0", port=port)
