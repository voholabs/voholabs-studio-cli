import { createInterface } from 'readline';
import { readFileSync } from 'fs';
import { PostizAPI } from '../api';
import { getConfig } from '../config';

interface BriefRule {
  heading: string;
  body: string;
}

interface BriefLink {
  url: string;
  note?: string;
}

interface BriefAsset {
  name: string;
  url: string;
  mime?: string;
  note?: string;
}

const ruleId = () => Math.random().toString(36).slice(2, 12);

// Changing the brief changes what gets published, so a person confirms it.
// When nothing is attached to the terminal there is nobody to ask, and the
// command refuses rather than assuming consent.
async function confirmHuman(summary: string) {
  console.log('');
  console.log(summary);
  console.log('');

  if (!process.stdin.isTTY) {
    console.error('❌ This changes the agent brief and needs a human to approve it.');
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

export async function briefSchema() {
  const api = new PostizAPI(getConfig());

  try {
    const result = await api.getBriefSchema();
    console.log('🧠 Brief structure:');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error('❌ Failed to read the brief schema:', error.message);
    process.exit(1);
  }
}

export async function briefList(args: any) {
  const api = new PostizAPI(getConfig());

  try {
    const result = await api.getBrief();
    const documents = args?.category
      ? result.documents.filter((d: any) => d.category === args.category)
      : result.documents;

    console.log('🧠 Agent brief:');
    console.log(JSON.stringify({ ...result, documents }, null, 2));
    return documents;
  } catch (error: any) {
    console.error('❌ Failed to read the brief:', error.message);
    process.exit(1);
  }
}

export async function briefGet(args: any) {
  const api = new PostizAPI(getConfig());

  try {
    const result = await api.getBriefDocument(args.category, args.key);
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error('❌ Failed to read the document:', error.message);
    process.exit(1);
  }
}

export async function briefSet(args: any) {
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

  const rules: BriefRule[] = Array.isArray(payload) ? payload : payload.rules || [];
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
    body.links = (payload.links as BriefLink[]).map((link) => ({
      id: ruleId(),
      url: String(link.url || ''),
      note: String(link.note || ''),
    }));
  }

  // Brand files: upload with `voholabs upload` first, then pass the path it
  // returns as the url here. Omitting assets leaves the stored ones alone.
  if (payload.assets) {
    body.assets = (payload.assets as BriefAsset[]).map((asset) => ({
      id: ruleId(),
      name: String(asset.name || ''),
      url: String(asset.url || ''),
      ...(asset.mime ? { mime: String(asset.mime) } : {}),
      note: String(asset.note || ''),
    }));
  }

  const blocks = body.blocks as BriefRule[];
  const preview = blocks
    .map((b) => `  • ${b.heading || '(no heading)'}\n    ${b.body.replace(/\n/g, '\n    ')}`)
    .join('\n');

  const attachments = [
    body.links ? `${(body.links as unknown[]).length} link(s)` : '',
    body.assets ? `${(body.assets as unknown[]).length} file(s)` : '',
  ]
    .filter(Boolean)
    .join(' and ');

  await confirmHuman(
    `About to REPLACE ${args.category}/${args.key} with ${blocks.length} rule(s)` +
      `${attachments ? `, ${attachments}` : ''}.\n` +
      `Anything currently in this document and not listed below will be lost.\n` +
      `${body.links ? '' : 'Links are left as they are.\n'}` +
      `${body.assets ? '' : 'Files are left as they are.\n'}` +
      `\n${preview || '  (no rules — this empties the document)'}`
  );

  try {
    const result = await api.saveBriefDocument(args.category, args.key, body);
    console.log('✅ Saved');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error('❌ Failed to save:', error.message);
    process.exit(1);
  }
}

export async function briefDelete(args: any) {
  const api = new PostizAPI(getConfig());

  let existing: any;
  try {
    existing = await api.getBriefDocument(args.category, args.key);
  } catch (error: any) {
    console.error('❌ Could not find that document:', error.message);
    process.exit(1);
  }

  const count = (existing?.content?.blocks || []).length;
  await confirmHuman(
    `About to DELETE ${args.category}/${args.key} and its ${count} rule(s). This cannot be undone.`
  );

  try {
    await api.deleteBriefDocument(args.category, args.key);
    console.log('✅ Deleted');
  } catch (error: any) {
    console.error('❌ Failed to delete:', error.message);
    process.exit(1);
  }
}
