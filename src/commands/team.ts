import { readFileSync } from 'fs';
import { PostizAPI } from '../api';
import { getConfig } from '../config';

export async function listTeam() {
  const api = new PostizAPI(getConfig());

  try {
    const result: any = await api.getTeam();
    console.log('👥 Team:');
    for (const member of result?.members || []) {
      console.log(`  ${member.email}`);
    }
    if (result && !result.emailProvider) {
      console.log(
        '\n⚠️  No email provider is configured, so notify would send nothing.'
      );
    }
    return result;
  } catch (error: any) {
    console.error('❌ Failed to read the team:', error.message);
    process.exit(1);
  }
}

export async function notifyTeam(args: any) {
  const api = new PostizAPI(getConfig());

  // --file keeps a long message out of shell quoting, which mangles newlines
  // and eats anything with an apostrophe in it.
  const message = args.file
    ? readFileSync(args.file, 'utf8')
    : args.message;

  if (!message) {
    console.error('❌ Pass --message or --file');
    process.exit(1);
  }

  const to = args.to
    ? String(args.to)
        .split(',')
        .map((one: string) => one.trim())
        .filter(Boolean)
    : undefined;

  try {
    const result: any = await api.notifyTeam({
      subject: args.subject,
      message,
      to,
    });

    if (!result?.delivered) {
      console.error(
        '❌ Nothing was sent. Either no email provider is configured, or none of the addresses are on this team.'
      );
      process.exit(1);
    }

    console.log(`✅ Sent to ${result.sent.length} team member(s):`);
    result.sent.forEach((email: string) => console.log(`  ${email}`));

    // The server drops non-members silently as far as delivery goes, so this
    // is the only place the caller finds out an address was ignored.
    if (result.rejected?.length) {
      console.log('\n⚠️  Not on this team, so not sent:');
      result.rejected.forEach((email: string) => console.log(`  ${email}`));
    }

    return result;
  } catch (error: any) {
    console.error('❌ Failed to email the team:', error.message);
    process.exit(1);
  }
}
