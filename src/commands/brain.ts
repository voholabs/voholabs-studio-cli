import { createInterface } from 'readline';
import { readFileSync } from 'fs';
import { PostizAPI } from '../api';
import { getConfig } from '../config';

interface BrainRule {
  heading: string;
  body: string;
}

interface BrainLink {
  url: string;
  note?: string;
}

const ruleId = () => Math.random().toString(36).slice(2, 12);

// Changing the brain changes what gets published, so a person confirms it.
// When nothing is attached to the terminal there is nobody to ask, and the
// command refuses rather than assuming consent.
async function confirmHuman(summary: string) {
  console.log('');
  console.log(summary);
  console.log('');

  if (!process.stdin.isTTY) {
    console.error('❌ This changes the agent brain and needs a human to approve it.');
    console.error('   Run it in a terminal; it will not auto-approve.');
    process.exit(1);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => {
    rl.question("Type 'yes' to apply this change: ", (a) => {
      rl.close();
      resolve(String(a || '').trim().toLowerCase());
    });
  });

  if (answer !== 'yes') {
    console.log('⚠️  Cancelled, nothing was changed.');
    process.exit(0);
  }
}

export async function brainSchema() {
  const api = new PostizAPI(getConfig());

  try {
    const result = await api.getBrainSchema();
    console.log('🧠 Brain structure:');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error('❌ Failed to read the brain schema:', error.message);
    process.exit(1);
  }
}

export async function brainList(args: any) {
  const api = new PostizAPI(getConfig());

  try {
    const result = await api.getBrain();
    const documents = args?.category
      ? result.documents.filter((d: any) => d.category === args.category)
      : result.documents;

    console.log('🧠 Agent brain:');
    console.log(JSON.stringify({ ...result, documents }, null, 2));
    return documents;
  } catch (error: any) {
    console.error('❌ Failed to read the brain:', error.message);
    process.exit(1);
  }
}

export async function brainGet(args: any) {
  const api = new PostizAPI(getConfig());

  try {
    const result = await api.getBrainDocument(args.category, args.key);
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error('❌ Failed to read the document:', error.message);
    process.exit(1);
  }
}

export async function brainSet(args: any) {
  const api = new PostizAPI(getConfig());

  let payload: any;
  try {
    const raw = args.file ? readFileSync(args.file, 'utf8') : args.rules;
    if (!raw) {
      console.error("❌ Pass --file <path> or --rules '<json>'");
      process.exit(1);
    }
    payload = JSON.parse(raw);
  } catch (error: any) {
    console.error('❌ Could not read the rules:', error.message);
    process.exit(1);
  }

  const rules: BrainRule[] = Array.isArray(payload) ? payload : payload.rules || [];
  const body: Record<string, unknown> = {
    blocks: rules.map((rule) => ({
      id: ruleId(),
      heading: String(rule.heading || ''),
      body: String(rule.body || ''),
    })),
  };

  if (payload.title !== undefined) {
    body.title = String(payload.title);
  }

  if (payload.links) {
    body.links = (payload.links as BrainLink[]).map((link) => ({
      id: ruleId(),
      url: String(link.url || ''),
      note: String(link.note || ''),
    }));
  }

  const blocks = body.blocks as BrainRule[];
  const preview = blocks
    .map((b) => `  • ${b.heading || '(no heading)'}\n    ${b.body.replace(/\n/g, '\n    ')}`)
    .join('\n');

  await confirmHuman(
    `About to REPLACE ${args.category}/${args.key} with ${blocks.length} rule(s).\n` +
      `Anything currently in this document and not listed below will be lost.\n\n` +
      `${preview || '  (no rules — this empties the document)'}`
  );

  try {
    const result = await api.saveBrainDocument(args.category, args.key, body);
    console.log('✅ Saved');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error('❌ Failed to save:', error.message);
    process.exit(1);
  }
}

export async function brainDelete(args: any) {
  const api = new PostizAPI(getConfig());

  let existing: any;
  try {
    existing = await api.getBrainDocument(args.category, args.key);
  } catch (error: any) {
    console.error('❌ Could not find that document:', error.message);
    process.exit(1);
  }

  const count = (existing?.content?.blocks || []).length;
  await confirmHuman(
    `About to DELETE ${args.category}/${args.key} and its ${count} rule(s). This cannot be undone.`
  );

  try {
    await api.deleteBrainDocument(args.category, args.key);
    console.log('✅ Deleted');
  } catch (error: any) {
    console.error('❌ Failed to delete:', error.message);
    process.exit(1);
  }
}
