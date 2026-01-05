"""Delete issues."""

import sys
from . import LinearClient


def run(args: list[str]) -> None:
    """Delete issues. Usage: delete DEF-1,DEF-2 or delete 1,2,3"""
    if not args:
        print("Usage: delete <identifiers> (e.g., DEF-1,DEF-2 or 1,2,3)")
        sys.exit(1)

    identifiers = [i.strip() for i in args[0].split(",")]
    client = LinearClient()

    for ident in identifiers:
        # Add DEF- prefix if just a number
        if ident.isdigit():
            ident = f"DEF-{ident}"

        # Get issue UUID from identifier
        result = client.query(f'{{ issue(id: "{ident}") {{ id }} }}')
        issue_data = result.get("data", {}).get("issue")

        if not issue_data:
            print(f"{ident}: not found")
            continue

        issue_uuid = issue_data["id"]
        delete_result = client.query(f'''
            mutation {{ issueDelete(id: "{issue_uuid}") {{ success }} }}
        ''')

        if delete_result.get("data", {}).get("issueDelete", {}).get("success"):
            print(f"{ident}: deleted")
        else:
            print(f"{ident}: failed to delete")
