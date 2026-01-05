"""Update an issue title."""

import sys
from . import LinearClient


def run(args: list[str]) -> None:
    """Update task title. Usage: update <issue-id> "New title" """
    if len(args) < 2:
        print('Usage: update <issue-id> "New title"')
        sys.exit(1)

    issue_id = args[0]
    new_title = args[1]

    client = LinearClient()
    result = client.query(f'''
        mutation {{ issueUpdate(id: "{issue_id}", input: {{
            title: "{new_title}"
        }}) {{
            success
            issue {{ id identifier title }}
        }} }}
    ''')

    data = result.get("data", {}).get("issueUpdate", {})
    if data.get("success"):
        issue = data.get("issue", {})
        print(f"Updated: {issue.get('identifier')} - {issue.get('title')}")
    else:
        print("Failed to update issue")
        print(result)
