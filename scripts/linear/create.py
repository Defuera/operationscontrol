"""Create a new issue."""

import sys
from . import LinearClient, TEAM_ID, PROJECT_ID, LABELS


def run(args: list[str]) -> None:
    """Create a new task. Usage: create "Title" label [priority]"""
    if len(args) < 2:
        print('Usage: create "Title" work|side|chores [priority 0-4]')
        sys.exit(1)

    title = args[0]
    label = args[1].lower()
    priority = int(args[2]) if len(args) > 2 else 3

    if label not in LABELS:
        print(f"Label must be: {', '.join(LABELS.keys())}")
        sys.exit(1)

    label_id = LABELS[label]
    client = LinearClient()
    result = client.query(f'''
        mutation {{ issueCreate(input: {{
            title: "{title}",
            teamId: "{TEAM_ID}",
            projectId: "{PROJECT_ID}",
            labelIds: ["{label_id}"],
            priority: {priority}
        }}) {{
            success
            issue {{ id identifier title }}
        }} }}
    ''')

    data = result.get("data", {}).get("issueCreate", {})
    if data.get("success"):
        issue = data.get("issue", {})
        print(f"Created: {issue.get('identifier')} - {issue.get('title')}")
    else:
        print("Failed to create issue")
        print(result)
