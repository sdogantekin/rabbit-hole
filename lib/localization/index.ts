import { en } from './strings/en';

// v1 is English-only (see requirements.md §9), but routing every string through here
// avoids a retrofit when a second language is added.
const dictionaries = { en };
const currentLocale: keyof typeof dictionaries = 'en';

type Vars = Record<string, string | number>;

function resolve(path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (node, key) =>
        typeof node === 'object' && node !== null ? (node as Record<string, unknown>)[key] : undefined,
      dictionaries[currentLocale],
    );
}

export function t(path: string, vars?: Vars): string {
  const value = resolve(path);
  if (typeof value !== 'string') {
    throw new Error(`Missing localization string for key "${path}"`);
  }
  if (!vars) return value;
  return Object.entries(vars).reduce(
    (result, [key, val]) => result.replaceAll(`{{${key}}}`, String(val)),
    value,
  );
}
