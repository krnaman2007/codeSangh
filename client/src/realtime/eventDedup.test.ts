import test from 'node:test';
import assert from 'node:assert/strict';
import { MutationEventDeduplicator } from './eventDedup';

test('MutationEventDeduplicator deduplicates matching local event once within TTL', () => {
  const dedup = new MutationEventDeduplicator(5000);
  dedup.markLocal('node:created:123', 1000);

  assert.equal(dedup.shouldDeduplicate('node:created:123', 2000), true);
  // Consumed once, subsequent remote event should not be dropped
  assert.equal(dedup.shouldDeduplicate('node:created:123', 2500), false);
});

test('MutationEventDeduplicator expires entries after TTL', () => {
  const dedup = new MutationEventDeduplicator(1000);
  dedup.markLocal('node:deleted:abc', 1000);

  assert.equal(dedup.shouldDeduplicate('node:deleted:abc', 2500), false);
});
