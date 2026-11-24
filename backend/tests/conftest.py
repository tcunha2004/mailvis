import os

# The LLM client is built at import time; it only needs a region, never a real call here.
os.environ.setdefault("AWS_REGION", "us-east-1")
