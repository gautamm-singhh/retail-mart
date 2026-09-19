import os
import sys
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

from app import create_app

env = os.environ.get("FLASK_ENV")
if not env and (os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME")):
    env = "production"
app = create_app(env or "development")

if __name__ == "__main__":
    from migrate import run_migration
    run_migration(app)
    port = int(os.environ.get("PORT", 4000))
    app.run(host="0.0.0.0", port=port, debug=app.config.get("DEBUG", True), use_reloader=False)
