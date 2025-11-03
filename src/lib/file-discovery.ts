export const MEDIA_EXTENSIONS = [
  'mp4',
  'm4v',
  'mov',
  'mkv',
  'webm',
  'avi',
  'mpg',
  'mpeg',
  'ts',
  'm2ts',
  'mxf',
  'hevc',
  'h265',
  'h264',
  'flv',
  'ogv',
  'wmv',
  'gif',
  'mp3',
  'aac',
  'm4a',
  'flac',
  'wav',
  'aiff',
  'aif',
  'ogg',
  'opus',
  'wma',
  'alac',
  'png',
  'jpg',
  'jpeg',
  'webp',
];

const MEDIA_EXTENSION_SET = new Set(MEDIA_EXTENSIONS);

export interface DiscoveredEntry {
  path: string;
  name: string;
}

interface TauriFile extends File {
  path?: string;
}

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function basename(input: string): string {
  const normalized = input.replace(/\\/g, '/');
  const segments = normalized.split('/');
  return segments[segments.length - 1] || input;
}

function hasAllowedExtension(path: string): boolean {
  const match = /\.([^.]+)$/.exec(path);
  if (!match) {
    return false;
  }
  const ext = match[1]?.toLowerCase() ?? '';
  return MEDIA_EXTENSION_SET.has(ext);
}

export async function discoverDroppedEntries(files: FileList | File[]): Promise<DiscoveredEntry[]> {
  const list = Array.from(files ?? []);

  if (!isTauriRuntime()) {
    return list.map((file) => {
      const tauriLike = file as TauriFile;
      const name = file.name || tauriLike.path || 'Untitled';
      return {
        path: tauriLike.path ?? name,
        name,
      };
    });
  }

  const candidates = list
    .map((file) => (file as TauriFile).path)
    .filter((path): path is string => Boolean(path));

  if (!candidates.length) {
    return [];
  }

  const { invoke } = await import('@tauri-apps/api/core');
  let expanded: string[] = [];
  try {
    expanded = await invoke<string[]>('expand_media_paths', { paths: candidates });
  } catch (error) {
    console.warn('[file-discovery] Failed to expand paths via Tauri command', error);
    expanded = candidates;
  }
  const unique = new Set<string>();

  for (const path of expanded) {
    if (!hasAllowedExtension(path)) {
      continue;
    }
    unique.add(path);
  }

  return Array.from(unique).map((path) => ({
    path,
    name: basename(path),
  }));
}
