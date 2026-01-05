"""Change issue status."""

import sys
from . import LinearClient, STATES


def run(args: list[str]) -> None:
    """Change task status. Usage: status <issue-id> backlog|todo|progress|done"""
    if len(args) < 2:
        print(f"Usage: status <issue-id> {' | '.join(STATES.keys())}")
        sys.exit(1)

    issue_id = args[0]
    status = args[1].lower()

    if status not in STATES:
        print(f"Status must be: {', '.join(STATES.keys())}")
        sys.exit(1)

    state_id = STATES[status]
    client = LinearClient()
    result = client.query(f'''
        mutation {{ issueUpdate(id: "{issue_id}", input: {{
            stateId: "{state_id}"
        }}) {{
            success
            issue {{ id identifier title state {{ name }} }}
        }} }}
    ''')

    data = result.get("data", {}).get("issueUpdate", {})
    if data.get("success"):
        issue = data.get("issue", {})
        state = issue.get("state", {}).get("name", "")
        print(f"{issue.get('identifier')}: {issue.get('title')} -> {state}")
    else:
        print("Failed to update status")
        print(result)
