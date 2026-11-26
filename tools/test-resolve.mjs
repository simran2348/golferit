/**
 * Lets `node --test` run the TypeScript sources directly. Source files import
 * each other without extensions ('./geometry', './courses'), which Node's ESM
 * resolver rejects. For relative specifiers that fail, retry with '.ts', then
 * '/index.ts'. Bare and absolute specifiers are left alone.
 *
 * Loaded with `node --import ./tools/test-resolve.mjs`. Module hooks run on a
 * separate thread, so the main thread registers this same file as the hook.
 */
import { register } from 'node:module';
import { isMainThread } from 'node:worker_threads';

const RETRY_CODES = new Set([
  'ERR_MODULE_NOT_FOUND',
  'ERR_UNSUPPORTED_DIR_IMPORT',
]);
const SUFFIXES = ['.ts', '/index.ts'];

const isRelative = (specifier) =>
  specifier.startsWith('./') || specifier.startsWith('../');

export const resolve = async (specifier, context, nextResolve) => {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (!isRelative(specifier) || !RETRY_CODES.has(error?.code)) throw error;
    for (const suffix of SUFFIXES) {
      try {
        return await nextResolve(specifier + suffix, context);
      } catch {
        // Try the next suffix.
      }
    }
    throw error;
  }
};

if (isMainThread) register(import.meta.url);
