import * as Y from 'yjs';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness';
import { MonacoBinding } from 'y-monaco';
import type * as monaco from 'monaco-editor';

export interface YjsDocumentEntry {
  fileId: string;
  doc: Y.Doc;
  yText: Y.Text;
  awareness: Awareness;
  binding: MonacoBinding | null;
  seeded: boolean;
}

export interface YjsUserAwarenessState {
  user: {
    id: string;
    name: string;
    color: string;
  };
}

export function pickCollaboratorColor(userId: string): string {
  const palette = ['#5E5CE6', '#14B8A6', '#F59E0B', '#EC4899', '#38BDF8', '#A78BFA'];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

export class YjsWorkspaceManager {
  private entries = new Map<string, YjsDocumentEntry>();

  getOrCreateDoc(
    fileId: string,
    user: { id: string; name: string; color?: string },
    onLocalUpdate?: (fileId: string, update: Uint8Array) => void,
    onAwarenessChange?: (fileId: string, update: Uint8Array) => void
  ): YjsDocumentEntry {
    const existing = this.entries.get(fileId);
    if (existing) return existing;

    const doc = new Y.Doc();
    const yText = doc.getText('monaco');
    const awareness = new Awareness(doc);

    const color = user.color || pickCollaboratorColor(user.id);
    awareness.setLocalStateField('user', {
      id: user.id,
      name: user.name,
      color,
    });

    if (onLocalUpdate) {
      doc.on('update', (update: Uint8Array, origin: unknown) => {
        if (origin !== 'remote') {
          onLocalUpdate(fileId, update);
        }
      });
    }

    if (onAwarenessChange) {
      awareness.on('update', ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
        if (origin === 'remote') return;
        const changed = added.concat(updated, removed);
        if (changed.length > 0) {
          onAwarenessChange(fileId, encodeAwarenessUpdate(awareness, changed));
        }
      });
    }

    const entry: YjsDocumentEntry = {
      fileId,
      doc,
      yText,
      awareness,
      binding: null,
      seeded: false,
    };

    this.entries.set(fileId, entry);
    return entry;
  }

  seedInitialContent(fileId: string, initialContent: string): void {
    const entry = this.entries.get(fileId);
    if (!entry || entry.seeded) return;
    entry.seeded = true;
    if (entry.yText.length === 0 && initialContent.length > 0) {
      entry.doc.transact(() => {
        entry.yText.insert(0, initialContent);
      }, 'seed');
    }
  }

  applyRemoteUpdate(fileId: string, update: Uint8Array): void {
    const entry = this.entries.get(fileId);
    if (!entry) return;
    entry.seeded = true;
    Y.applyUpdate(entry.doc, update, 'remote');
  }

  applyRemoteAwareness(fileId: string, update: Uint8Array): void {
    const entry = this.entries.get(fileId);
    if (!entry) return;
    applyAwarenessUpdate(entry.awareness, update, 'remote');
  }

  encodeFullState(fileId: string): Uint8Array | null {
    const entry = this.entries.get(fileId);
    if (!entry) return null;
    return Y.encodeStateAsUpdate(entry.doc);
  }

  attachMonaco(
    fileId: string,
    editor: monaco.editor.IStandaloneCodeEditor,
    model: monaco.editor.ITextModel
  ): () => void {
    const entry = this.entries.get(fileId);
    if (!entry) return () => {};

    if (entry.binding) {
      entry.binding.destroy();
      entry.binding = null;
    }

    const binding = new MonacoBinding(
      entry.yText,
      model,
      new Set([editor]),
      entry.awareness
    );
    entry.binding = binding;

    return () => {
      if (entry.binding === binding) {
        binding.destroy();
        entry.binding = null;
      }
    };
  }

  destroyFile(fileId: string): void {
    const entry = this.entries.get(fileId);
    if (!entry) return;
    entry.binding?.destroy();
    entry.awareness.destroy();
    entry.doc.destroy();
    this.entries.delete(fileId);
  }

  destroyAll(): void {
    for (const fileId of Array.from(this.entries.keys())) {
      this.destroyFile(fileId);
    }
  }
}
