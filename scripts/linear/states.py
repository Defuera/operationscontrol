"""List available workflow states."""

from . import LinearClient, TEAM_ID


def run(args: list[str]) -> None:
    """List all workflow states for the team."""
    client = LinearClient()
    result = client.query(f'''
        {{ team(id: "{TEAM_ID}") {{
            states {{ nodes {{ id name type }} }}
        }} }}
    ''')

    states = result.get("data", {}).get("team", {}).get("states", {}).get("nodes", [])
    for state in states:
        print(f"{state['name']} ({state['type']}): {state['id']}")
