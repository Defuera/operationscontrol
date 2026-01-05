# Scripts

Project scripts reference.

## Linear CLI

- MUST run from `scripts/` folder
- MUST have `LINEAR_API_KEY` in `.env`

## Commands

- `python3 linear.py list` - list all tasks
- `python3 linear.py create "Title" <label> [priority]` - create task
  - Labels: `work`, `side`, `chores`
  - Priority: `0` (urgent) to `4` (none), default `3`
- `python3 linear.py update <id> "New title"` - update title
- `python3 linear.py status <id> <status>` - change status
  - Statuses: `backlog`, `todo`, `progress`, `done`
- `python3 linear.py delete <ids>` - delete issues
  - Accepts: `DEF-1,DEF-2` or `1,2,3`
- `python3 linear.py states` - list workflow states

## Adding Commands

- MUST create new file in `scripts/linear/`
- MUST export `run(args: list[str])` function
- MUST register command in `scripts/linear.py`
