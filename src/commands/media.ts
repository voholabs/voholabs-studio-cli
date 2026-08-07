import { PostizAPI } from '../api';
import { getConfig } from '../config';

export async function listMedia(args: any) {
  const api = new PostizAPI(getConfig());

  try {
    const result = await api.listMedia(args?.page, args?.search);
    console.log('🖼️  Media library:');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error('❌ Failed to list media:', error.message);
    process.exit(1);
  }
}

export async function deleteMedia(args: any) {
  const api = new PostizAPI(getConfig());

  try {
    await api.deleteMedia(args.id);
    console.log('✅ Deleted');
  } catch (error: any) {
    console.error('❌ Failed to delete media:', error.message);
    process.exit(1);
  }
}

export async function findSlot(args: any) {
  const api = new PostizAPI(getConfig());

  try {
    const result = await api.findSlot(args.id);
    console.log('🕐 Next free slot:');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error('❌ Failed to find a slot:', error.message);
    process.exit(1);
  }
}
