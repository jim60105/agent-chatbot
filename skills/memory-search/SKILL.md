---
name: memory-search
description: Search through saved memories by keywords. Use when you need to recall previous conversations or information about the user.
---

# Memory Search Skill

Search through saved memories to retrieve relevant information.

## Usage

```bash
deno run --allow-net /home/deno/.copilot/skills/memory-search/skill.ts \
  --session-id "$SESSION_ID" \
  --query "hiking preferences" \
  --limit 10
```

## Output

```json
{
  "success": true,
  "data": {
    "memories": [
      {
        "id": "mem_xxx",
        "content": "User loves hiking in the mountains",
        "visibility": "public",
        "importance": "high",
        "timestamp": "2024-01-01T12:00:00Z"
      }
    ]
  }
}
```
