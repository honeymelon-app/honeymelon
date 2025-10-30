import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizePath(path: string): string {
  return path.replace(/\\+/g, '/');
}

export function pathDirname(input: string): string {
  if (!input) {
    return '';
  }
  const normalized = normalizePath(input).replace(/\/+/g, '/').replace(/\/+$/, '');
  if (!normalized) {
    return '';
  }
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash < 0) {
    return '';
  }
  if (lastSlash === 0) {
    return normalized.startsWith('/') ? '/' : '';
  }
  return normalized.slice(0, lastSlash);
}

export function pathBasename(input: string): string {
  if (!input) {
    return '';
  }
  const normalized = normalizePath(input).replace(/\/+$/, '');
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash < 0) {
    return normalized;
  }
  return normalized.slice(lastSlash + 1);
}

export function stripExtension(input: string): string {
  if (!input) {
    return '';
  }
  const normalized = normalizePath(input);
  const basename = pathBasename(normalized);
  const dirname = pathDirname(normalized);
  const dotIndex = basename.lastIndexOf('.');
  if (dotIndex <= 0) {
    return normalized;
  }
  const withoutExt = basename.slice(0, dotIndex);
  return dirname ? `${dirname}/${withoutExt}` : withoutExt;
}

export function joinPath(...segments: Array<string | undefined | null>): string {
  const filtered = segments.filter((segment): segment is string =>
    Boolean(segment && segment.length),
  );
  if (!filtered.length) {
    return '';
  }

  let result = normalizePath(filtered[0]);
  for (let index = 1; index < filtered.length; index += 1) {
    const segment = normalizePath(filtered[index]).replace(/^\/+/, '');
    if (!segment) {
      continue;
    }
    if (!result.endsWith('/')) {
      result += '/';
    }
    result += segment;
  }

  return result.replace(/\/+/g, '/');
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 10) / 10} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
}

export function getFileExtension(filename: string): string {
  const basename = pathBasename(filename);
  const dotIndex = basename.lastIndexOf('.');
  if (dotIndex <= 0) return '';
  return basename.slice(dotIndex + 1).toUpperCase();
}
