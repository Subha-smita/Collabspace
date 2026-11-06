import * as Y from 'yjs';
import { prosemirrorJSONToYXmlFragment, yXmlFragmentToProseMirrorRootNode } from 'y-prosemirror';
import { getSchema, type JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import ImageExt from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Callout, Toggle } from './blocks';

// Server-side TipTap schema. Must mirror the node/mark extensions used in components/Editor.tsx.
export const schema = getSchema([StarterKit.configure({ history: false }), Underline, Link, ImageExt, TaskList, TaskItem.configure({ nested: true }), Table, TableRow, TableHeader, TableCell, Callout, Toggle]);

/** TipTap JSON -> Yjs update bytes (the same "default" fragment the live editor and collab server use). */
export function jsonToUpdate(json: JSONContent): Uint8Array {
  const doc = new Y.Doc();
  prosemirrorJSONToYXmlFragment(schema, json, doc.getXmlFragment('default'));
  const u = Y.encodeStateAsUpdate(doc);
  doc.destroy();
  return u;
}

/** Saved Yjs update rows -> TipTap JSON. */
export function updatesToJson(updates: Uint8Array[]): JSONContent {
  const doc = new Y.Doc();
  updates.forEach((u) => Y.applyUpdate(doc, u));
  const json = yXmlFragmentToProseMirrorRootNode(doc.getXmlFragment('default'), schema).toJSON() as JSONContent;
  doc.destroy();
  return json;
}
