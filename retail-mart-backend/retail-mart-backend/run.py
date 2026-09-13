import os
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)

from app import create_app

app = create_app(os.environ.get("FLASK_ENV", "development"))

if __name__ == "__main__":
    from migrate import run_migration
    run_migration(app)
    port = int(os.environ.get("PORT", 4000))
    app.run(host="0.0.0.0", port=port, debug=app.config.get("DEBUG", True), use_reloader=False)
