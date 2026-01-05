#!/usr/bin/env python3
"""Linear CLI - manage tasks in The Journey project."""

import sys
from linear import list as list_cmd, create, update, status, delete, states

COMMANDS = {
    "list": list_cmd,
    "create": create,
    "update": update,
    "status": status,
    "delete": delete,
    "states": states,
}


def show_help():
    print("Usage: linear.py <command> [args]")
    print()
    print("Commands:")
    print("  list                            List all tasks")
    print('  create "Title" label [priority] Create task (label: work/side/chores)')
    print('  update <id> "New title"         Update task title')
    print("  status <id> <status>            Change status (backlog/todo/progress/done)")
    print("  delete <ids>                    Delete issues (e.g., DEF-1,DEF-2 or 1,2,3)")
    print("  states                          List workflow states")


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help", "help"):
        show_help()
        sys.exit(0)

    command = sys.argv[1]
    if command not in COMMANDS:
        print(f"Unknown command: {command}")
        show_help()
        sys.exit(1)

    COMMANDS[command].run(sys.argv[2:])


if __name__ == "__main__":
    main()
