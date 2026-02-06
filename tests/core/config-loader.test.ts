// tests/core/config-loader.test.ts

import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { loadConfig, loadSystemPrompt } from "@core/config-loader.ts";
import { ConfigError } from "../../src/types/errors.ts";

// Test with a temporary directory containing test config files
async function withTestConfig(
  configContent: string,
  fn: (dir: string) => Promise<void>,
): Promise<void> {
  const tempDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(`${tempDir}/config.yaml`, configContent);
    await fn(tempDir);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
}

Deno.test("loadConfig - should load valid configuration", async () => {
  const config = `
platforms:
  discord:
    token: "test-token"
    enabled: true
  misskey:
    host: "misskey.example.com"
    token: "test-token"
    enabled: false
agent:
  model: "gpt-4"
  systemPromptPath: "./prompts/system.md"
  tokenLimit: 4096
workspace:
  repoPath: "./data"
  workspacesDir: "workspaces"
`;

  await withTestConfig(config, async (dir) => {
    const result = await loadConfig(dir);
    assertEquals(result.platforms.discord.enabled, true);
    assertEquals(result.agent.model, "gpt-4");
    assertEquals(result.workspace.repoPath, "./data");
  });
});

Deno.test("loadConfig - should apply default values", async () => {
  const config = `
platforms:
  discord:
    token: "test-token"
    enabled: true
  misskey:
    enabled: false
agent:
  model: "gpt-4"
  systemPromptPath: "./prompts/system.md"
  tokenLimit: 4096
workspace:
  repoPath: "./data"
  workspacesDir: "workspaces"
`;

  await withTestConfig(config, async (dir) => {
    const result = await loadConfig(dir);
    // Default values should be applied
    assertEquals(result.memory.searchLimit, 10);
    assertEquals(result.memory.recentMessageLimit, 20);
    assertEquals(result.logging.level, "INFO");
  });
});

Deno.test("loadConfig - should override with environment variables", async () => {
  const config = `
platforms:
  discord:
    token: "original-token"
    enabled: true
  misskey:
    enabled: false
agent:
  model: "gpt-4"
  systemPromptPath: "./prompts/system.md"
  tokenLimit: 4096
workspace:
  repoPath: "./data"
  workspacesDir: "workspaces"
`;

  // Set environment variable
  Deno.env.set("DISCORD_TOKEN", "env-override-token");

  try {
    await withTestConfig(config, async (dir) => {
      const result = await loadConfig(dir);
      assertEquals(result.platforms.discord.token, "env-override-token");
    });
  } finally {
    Deno.env.delete("DISCORD_TOKEN");
  }
});

Deno.test("loadConfig - should throw on missing required fields", async () => {
  const config = `
platforms:
  discord:
    enabled: true
  misskey:
    enabled: false
agent:
  model: "gpt-4"
`;

  await withTestConfig(config, async (dir) => {
    await assertRejects(
      () => loadConfig(dir),
      ConfigError,
      "Missing required configuration fields",
    );
  });
});

Deno.test("loadConfig - should throw when no platform is enabled", async () => {
  const config = `
platforms:
  discord:
    token: "test-token"
    enabled: false
  misskey:
    enabled: false
agent:
  model: "gpt-4"
  systemPromptPath: "./prompts/system.md"
  tokenLimit: 4096
workspace:
  repoPath: "./data"
  workspacesDir: "workspaces"
`;

  await withTestConfig(config, async (dir) => {
    await assertRejects(
      () => loadConfig(dir),
      ConfigError,
      "At least one platform must be enabled",
    );
  });
});

// --- loadSystemPrompt tests ---

async function withPromptDir(
  files: Record<string, string>,
  fn: (systemPromptPath: string) => Promise<void>,
): Promise<void> {
  const tempDir = await Deno.makeTempDir();
  try {
    const promptDir = `${tempDir}/prompts`;
    await Deno.mkdir(promptDir, { recursive: true });
    for (const [name, content] of Object.entries(files)) {
      await Deno.writeTextFile(`${promptDir}/${name}`, content);
    }
    await fn(`${promptDir}/system.md`);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
}

Deno.test("loadSystemPrompt - should replace single placeholder with fragment file content", async () => {
  await withPromptDir(
    {
      "system.md": "Hello, I am {{character_name}}!",
      "character_name.md": "Yuna",
    },
    async (path) => {
      const result = await loadSystemPrompt(path);
      assertEquals(result, "Hello, I am Yuna!");
    },
  );
});

Deno.test("loadSystemPrompt - should replace multiple different placeholders", async () => {
  await withPromptDir(
    {
      "system.md": "Name: {{char_name}}, Info: {{char_info}}",
      "char_name.md": "Yuna",
      "char_info.md": "An AI assistant",
    },
    async (path) => {
      const result = await loadSystemPrompt(path);
      assertEquals(result, "Name: Yuna, Info: An AI assistant");
    },
  );
});

Deno.test("loadSystemPrompt - should replace same placeholder appearing multiple times", async () => {
  await withPromptDir(
    {
      "system.md": "I am {{name}}. Call me {{name}}.",
      "name.md": "Yuna",
    },
    async (path) => {
      const result = await loadSystemPrompt(path);
      assertEquals(result, "I am Yuna. Call me Yuna.");
    },
  );
});

Deno.test("loadSystemPrompt - should leave placeholder unchanged when fragment file is missing", async () => {
  await withPromptDir(
    {
      "system.md": "Hello {{missing_fragment}}!",
    },
    async (path) => {
      const result = await loadSystemPrompt(path);
      assertStringIncludes(result, "{{missing_fragment}}");
    },
  );
});

Deno.test("loadSystemPrompt - should not use system.md as a fragment source", async () => {
  await withPromptDir(
    {
      "system.md": "Hello {{system}}!",
    },
    async (path) => {
      const result = await loadSystemPrompt(path);
      // {{system}} should remain because system.md is excluded
      assertStringIncludes(result, "{{system}}");
    },
  );
});

Deno.test("loadSystemPrompt - should trim fragment content", async () => {
  await withPromptDir(
    {
      "system.md": "Name: {{char_name}}.",
      "char_name.md": "  Yuna  \n",
    },
    async (path) => {
      const result = await loadSystemPrompt(path);
      assertEquals(result, "Name: Yuna.");
    },
  );
});

Deno.test("loadSystemPrompt - should trim final result", async () => {
  await withPromptDir(
    {
      "system.md": "\n  Hello World  \n",
    },
    async (path) => {
      const result = await loadSystemPrompt(path);
      assertEquals(result, "Hello World");
    },
  );
});

Deno.test("loadSystemPrompt - should throw when system prompt file not found", async () => {
  await assertRejects(
    () => loadSystemPrompt("/nonexistent/path/system.md"),
    ConfigError,
    "System prompt file not found",
  );
});

Deno.test("loadSystemPrompt - should handle prompt with no placeholders", async () => {
  await withPromptDir(
    {
      "system.md": "A plain prompt with no placeholders.",
      "unused.md": "This should not matter.",
    },
    async (path) => {
      const result = await loadSystemPrompt(path);
      assertEquals(result, "A plain prompt with no placeholders.");
    },
  );
});
