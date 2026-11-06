
/** Uploads an image from the user's computer to a page and returns its URL. Throws an Error with a readable message. */
export async function uploadImage(pageId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image is too large (max 5 MB)');
  const fd = new FormData();
  fd.append('file', file);
  const r = await fetch(`/api/pages/${pageId}/uploads`, { method: 'POST', body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? 'Upload failed');
  return j.url as string;
}
