import os
import sys

# Ensure the backend root directory is in sys.path so app and run resolve
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from run import app
