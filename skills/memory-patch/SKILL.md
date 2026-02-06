---
name: memory-patch
description: Modify memory metadata (visibility, importance) or disable memories. Use when you need to update the status of existing memories.
---

# Memory Patch Skill

Modify metadata of existing memories without changing content.

## Usage

```bash
# Disable a memory
deno run --allow-net /home/deno/.copilot/skills/memory-patch/skill.ts \
  --session-id "$SESSION_ID" \
  --memory-id "mem_abc123" \
  --disabled

# Change importance
deno run --allow-net /home/deno/.copilot/skills/memory-patch/skill.ts \
  --session-id "$SESSION_ID" \
  --memory-id "mem_abc123" \
  --importance high
```

## Capabilities

- Enable/disable memories (use --enabled or --disabled flag)
- Change visibility level
- Adjust importance level

## Limitations

- **Cannot modify content** - content is immutable
- **Cannot delete** - can only disable

## Output

```json
{ "success": true, "data": { "id": "mem_abc123", "enabled": false } }
```
