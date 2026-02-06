---
name: memory-save
description: Save important information to persistent cross-conversation memory. Use when you learn something important about the user or context that should be remembered for future conversations.
---

# Memory Save Skill

Save important information that should persist across conversations.

## Usage

```bash
deno run --allow-net /home/deno/.copilot/skills/memory-save/skill.ts \
  --session-id "$SESSION_ID" \
  --content "User prefers formal communication" \
  --importance high
```

## Parameters

- `--content`: (Required) The memory content to save
- `--visibility`: `public` (default) or `private`
- `--importance`: `normal` (default) or `high`

## Output

```json
{
  "success": true,
  "data": { "id": "mem_xxx", "content": "...", "visibility": "public", "importance": "normal" }
}
```
