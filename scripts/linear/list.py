"""List issues in The Journey project."""

from . import LinearClient, PROJECT_ID


def run(args: list[str]) -> None:
    """List all tasks in the project."""
    client = LinearClient()
    result = client.query(f'''
        {{ project(id: "{PROJECT_ID}") {{
            issues {{ nodes {{
                id identifier title
                state {{ name }}
                labels {{ nodes {{ name }} }}
                priority
            }} }}
        }} }}
    ''')

    issues = result.get("data", {}).get("project", {}).get("issues", {}).get("nodes", [])
    for issue in issues:
        state = issue.get("state", {}).get("name", "")
        labels = [l["name"] for l in issue.get("labels", {}).get("nodes", [])]
        label_str = f" [{', '.join(labels)}]" if labels else ""
        print(f"{issue['identifier']}: {issue['title']} ({state}){label_str}")
