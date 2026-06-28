// Postman folder (sub-collection) builders: group requests by OpenAPI tag.

import type { PostmanFolder, PostmanItem, PostmanAuth, CollectionItem } from "./types.js";
import { isFolder } from "./types.js";

/** Create a Postman folder with the given name and items. */
export function makeFolder(
  name: string,
  items: readonly (PostmanItem | PostmanFolder)[],
  description?: string,
  auth?: PostmanAuth,
): PostmanFolder {
  return { name, description, item: items, auth };
}

/** Add items to a folder immutably. */
export function appendToFolder(
  folder: PostmanFolder,
  items: readonly (PostmanItem | PostmanFolder)[],
): PostmanFolder {
  return { ...folder, item: [...folder.item, ...items] };
}

/** Find an existing folder by name within a flat list of items. */
export function findFolder(
  items: readonly CollectionItem[],
  name: string,
): PostmanFolder | undefined {
  for (const item of items) {
    if (isFolder(item) && item.name === name) return item;
  }
  return undefined;
}

/** Group a list of items by a tag-resolver function into folders. */
export function groupIntoFolders(
  items: readonly PostmanItem[],
  tagOf: (item: PostmanItem) => string,
): readonly (PostmanItem | PostmanFolder)[] {
  const map = new Map<string, PostmanItem[]>();
  const untagged: PostmanItem[] = [];

  for (const item of items) {
    const tag = tagOf(item);
    if (!tag) {
      untagged.push(item);
      continue;
    }
    const bucket = map.get(tag) ?? [];
    bucket.push(item);
    map.set(tag, bucket);
  }

  const folders: PostmanFolder[] = Array.from(map.entries()).map(([name, folderItems]) =>
    makeFolder(name, folderItems),
  );

  return [...folders, ...untagged];
}

/** Create a folder from an OpenAPI tag name and its items. Alias for makeFolder. */
export function makeFolderFromTag(
  tag: string,
  items: readonly (PostmanItem | PostmanFolder)[],
  description?: string,
  auth?: PostmanAuth,
): PostmanFolder {
  return makeFolder(tag, items, description, auth);
}

/** Sort folders alphabetically by name, preserving non-folder items at end. */
export function sortFolders(items: readonly CollectionItem[]): readonly CollectionItem[] {
  const folders = items.filter(isFolder).slice().sort((a, b) => a.name.localeCompare(b.name));
  const rest = items.filter((i) => !isFolder(i));
  return [...folders, ...rest];
}

/** Merge two flat item-lists, grouping any matching folder names together. */
export function mergeFolders(
  base: readonly CollectionItem[],
  additions: readonly CollectionItem[],
): readonly CollectionItem[] {
  const result: CollectionItem[] = [...base];

  for (const addition of additions) {
    if (!isFolder(addition)) {
      result.push(addition);
      continue;
    }
    const existing = result.findIndex(
      (i) => isFolder(i) && i.name === addition.name,
    );
    if (existing >= 0) {
      const existingFolder = result[existing] as PostmanFolder;
      result[existing] = appendToFolder(existingFolder, addition.item);
    } else {
      result.push(addition);
    }
  }

  return result;
}
