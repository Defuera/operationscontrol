"""Linear API client and configuration."""

import json
import os
import urllib.request
from pathlib import Path

# Load .env file
env_path = Path(__file__).parent.parent.parent / ".env"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ[key] = value.strip('"').strip("'")

API_URL = "https://api.linear.app/graphql"
TEAM_ID = "0da72f3c-bf78-4d83-ad6b-8128b4040999"
PROJECT_ID = "44d3b9b5-4966-472f-9994-b86ba173799e"

LABELS = {
    "work": "bc5e0a3b-91ca-4ee2-9271-6bba9bb7e4d3",
    "side": "f8ecff5e-34d2-48e6-b614-5c38b5121c45",
    "chores": "a9973006-abb6-479e-8b4e-3d0972642605",
}

STATES = {
    "backlog": "dc9df7ee-d38a-4701-a423-c093a09eceb4",
    "todo": "bec1ce29-ad92-46c3-9a2e-2c2aa721be8d",
    "progress": "3935826a-11d4-48c0-be9c-b5b8e553c614",
    "done": "5df0601e-ba42-4c1e-be3d-eb8f97e406a2",
}


class LinearClient:
    """Client for Linear GraphQL API."""

    def __init__(self):
        self.api_key = os.environ.get("LINEAR_API_KEY")
        if not self.api_key:
            raise RuntimeError("LINEAR_API_KEY not set")

    def query(self, graphql: str) -> dict:
        """Execute a GraphQL query."""
        data = json.dumps({"query": graphql}).encode()
        req = urllib.request.Request(
            API_URL,
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": self.api_key,
            },
        )
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
