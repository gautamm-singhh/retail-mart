import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

if "VERCEL" not in os.environ:
    os.environ["VERCEL"] = "1"

from run import app
