import { PostizAPI } from '../api';
import { getConfig } from '../config';

// The skills library: proven methods for content jobs. Opens with the first
// wallet top-up; paid plans always have it.

export async function skillsList(args: any) {
  const api = new PostizAPI(getConfig());

  try {
    const result: any = await api.listSkills(args?.tag, args?.search);
    console.log('🧠 Skills:');
    for (const skill of result?.skills || []) {
      console.log(`  ${skill.slug}: ${skill.name} - ${skill.summary}`);
    }
    if (result?.tags?.length) {
      console.log(
        `\nTags: ${result.tags.map((tag: any) => tag.key).join(', ')}`
      );
    }
    return result;
  } catch (error: any) {
    console.error('❌ Failed to list skills:', error.message);
    process.exit(1);
  }
}

export async function skillsGet(args: any) {
  const api = new PostizAPI(getConfig());

  try {
    const result: any = await api.getSkill(args.slug);
    console.log(`# ${result.name}\n`);
    console.log(result.body || JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error('❌ Failed to read the skill:', error.message);
    process.exit(1);
  }
}
