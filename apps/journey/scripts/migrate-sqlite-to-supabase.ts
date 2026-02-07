import Database from 'better-sqlite3';
import postgres from 'postgres';
import { readFileSync } from 'fs';

// Load .env manually
const envContent = readFileSync('.env', 'utf-8');
const envVars = Object.fromEntries(
  envContent.split('\n').filter(line => line && !line.startsWith('#')).map(line => {
    const [key, ...valueParts] = line.split('=');
    return [key, valueParts.join('=')];
  })
);
process.env.DATABASE_URL = envVars.DATABASE_URL;

const SQLITE_PATH = './local.db';
const USER_ID = 'ed62d484-754f-4621-bfec-f069223933ef';

async function migrate() {
  const sqlite = new Database(SQLITE_PATH);
  const pg = postgres(process.env.DATABASE_URL!);

  try {
    console.log('Starting migration...\n');

    // Clear existing test data first
    console.log('Clearing existing test data...');
    await pg`DELETE FROM ai_actions`;
    await pg`DELETE FROM ai_messages`;
    await pg`DELETE FROM ai_threads WHERE user_id = ${USER_ID}`;
    await pg`DELETE FROM journal_entries WHERE user_id = ${USER_ID}`;
    await pg`DELETE FROM task_links WHERE user_id = ${USER_ID}`;
    await pg`DELETE FROM tasks WHERE user_id = ${USER_ID}`;
    await pg`DELETE FROM goals WHERE user_id = ${USER_ID}`;
    await pg`DELETE FROM projects WHERE user_id = ${USER_ID}`;
    console.log('Done.\n');

    // Migrate projects
    const projects = sqlite.prepare('SELECT * FROM projects').all() as any[];
    console.log(`Migrating ${projects.length} projects...`);
    for (const p of projects) {
      await pg`INSERT INTO projects (id, user_id, name, description, type, status, goals, created_at, updated_at)
        VALUES (${p.id}, ${USER_ID}, ${p.name}, ${p.description}, ${p.type}, ${p.status}, ${p.goals}, ${p.created_at}, ${p.updated_at})`;
    }
    console.log('Done.\n');

    // Migrate goals
    const goals = sqlite.prepare('SELECT * FROM goals').all() as any[];
    console.log(`Migrating ${goals.length} goals...`);
    for (const g of goals) {
      await pg`INSERT INTO goals (id, user_id, title, description, horizon, status, created_at, updated_at)
        VALUES (${g.id}, ${USER_ID}, ${g.title}, ${g.description}, ${g.horizon}, ${g.status}, ${g.created_at}, ${g.updated_at})`;
    }
    console.log('Done.\n');

    // Migrate tasks
    const tasks = sqlite.prepare('SELECT * FROM tasks').all() as any[];
    console.log(`Migrating ${tasks.length} tasks...`);
    for (const t of tasks) {
      await pg`INSERT INTO tasks (id, user_id, title, description, status, domain, priority, scheduled_for, board_scope, project_id, created_at, updated_at)
        VALUES (${t.id}, ${USER_ID}, ${t.title}, ${t.description}, ${t.status}, ${t.domain}, ${t.priority}, ${t.scheduled_for}, ${t.board_scope}, ${t.project_id}, ${t.created_at}, ${t.updated_at})`;
    }
    console.log('Done.\n');

    // Migrate task_links
    const taskLinks = sqlite.prepare('SELECT * FROM task_links').all() as any[];
    console.log(`Migrating ${taskLinks.length} task links...`);
    for (const tl of taskLinks) {
      await pg`INSERT INTO task_links (id, user_id, task_a_id, task_b_id, link_type, created_at)
        VALUES (${tl.id}, ${USER_ID}, ${tl.task_a_id}, ${tl.task_b_id}, ${tl.link_type}, ${tl.created_at})`;
    }
    console.log('Done.\n');

    // Migrate journal_entries
    const journalEntries = sqlite.prepare('SELECT * FROM journal_entries').all() as any[];
    console.log(`Migrating ${journalEntries.length} journal entries...`);
    for (const je of journalEntries) {
      await pg`INSERT INTO journal_entries (id, user_id, content, ai_analysis, created_at)
        VALUES (${je.id}, ${USER_ID}, ${je.content}, ${je.ai_analysis}, ${je.created_at})`;
    }
    console.log('Done.\n');

    // Migrate ai_threads
    const aiThreads = sqlite.prepare('SELECT * FROM ai_threads').all() as any[];
    console.log(`Migrating ${aiThreads.length} AI threads...`);
    for (const at of aiThreads) {
      await pg`INSERT INTO ai_threads (id, user_id, anchor_path, title, archived_at, created_at, updated_at)
        VALUES (${at.id}, ${USER_ID}, ${at.anchor_path}, ${at.title}, ${at.archived_at}, ${at.created_at}, ${at.updated_at})`;
    }
    console.log('Done.\n');

    // Migrate ai_messages
    const aiMessages = sqlite.prepare('SELECT * FROM ai_messages').all() as any[];
    console.log(`Migrating ${aiMessages.length} AI messages...`);
    for (const am of aiMessages) {
      await pg`INSERT INTO ai_messages (id, thread_id, role, content, tool_calls, model, prompt_tokens, completion_tokens, created_at)
        VALUES (${am.id}, ${am.thread_id}, ${am.role}, ${am.content}, ${am.tool_calls}, ${am.model}, ${am.prompt_tokens}, ${am.completion_tokens}, ${am.created_at})`;
    }
    console.log('Done.\n');

    // Migrate ai_actions
    const aiActions = sqlite.prepare('SELECT * FROM ai_actions').all() as any[];
    console.log(`Migrating ${aiActions.length} AI actions...`);
    for (const aa of aiActions) {
      await pg`INSERT INTO ai_actions (id, message_id, action_type, entity_type, entity_id, payload, status, snapshot_before, snapshot_after, created_at, executed_at, reverted_at)
        VALUES (${aa.id}, ${aa.message_id}, ${aa.action_type}, ${aa.entity_type}, ${aa.entity_id}, ${aa.payload}, ${aa.status}, ${aa.snapshot_before}, ${aa.snapshot_after}, ${aa.created_at}, ${aa.executed_at}, ${aa.reverted_at})`;
    }
    console.log('Done.\n');

    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    sqlite.close();
    await pg.end();
  }
}

migrate();
