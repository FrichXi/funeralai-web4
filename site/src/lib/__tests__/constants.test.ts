import { describe, it, expect } from 'vitest';
import {
  NODE_TYPE_REGISTRY,
  NODE_COLORS,
  NODE_TYPE_LABELS,
  NODE_BADGE_CLASSES,
  ALL_NODE_TYPES,
  RELATION_STYLES,
} from '../constants';
import type { NodeType, RelationType } from '../types';

describe('NODE_TYPE_REGISTRY', () => {
  const expectedTypes: NodeType[] = ['company', 'person', 'product', 'vc_firm'];

  it('contains all expected node types', () => {
    for (const type of expectedTypes) {
      expect(NODE_TYPE_REGISTRY[type]).toBeDefined();
    }
  });

  it('each entry has color, label, and badgeClass', () => {
    for (const [type, entry] of Object.entries(NODE_TYPE_REGISTRY)) {
      expect(entry.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(entry.label).toBeTruthy();
      expect(entry.badgeClass).toBeTruthy();
    }
  });
});

describe('derived constants', () => {
  it('NODE_COLORS has same keys as registry', () => {
    expect(Object.keys(NODE_COLORS).sort()).toEqual(Object.keys(NODE_TYPE_REGISTRY).sort());
  });

  it('NODE_TYPE_LABELS has same keys as registry', () => {
    expect(Object.keys(NODE_TYPE_LABELS).sort()).toEqual(Object.keys(NODE_TYPE_REGISTRY).sort());
  });

  it('NODE_BADGE_CLASSES has same keys as registry', () => {
    expect(Object.keys(NODE_BADGE_CLASSES).sort()).toEqual(Object.keys(NODE_TYPE_REGISTRY).sort());
  });

  it('ALL_NODE_TYPES matches registry keys', () => {
    expect([...ALL_NODE_TYPES].sort()).toEqual(Object.keys(NODE_TYPE_REGISTRY).sort());
  });
});

describe('RELATION_STYLES', () => {
  const expectedRelations: RelationType[] = [
    'acquires', 'co_founded', 'collaborates_with', 'compares_to',
    'competes_with', 'criticizes', 'develops', 'founder_of',
    'integrates_with', 'invests_in', 'mentors', 'partners_with',
    'related',
    'praises', 'works_at', 'works_on',
  ];

  it('contains all relation types', () => {
    expect(Object.keys(RELATION_STYLES).sort()).toEqual(expectedRelations.sort());
  });

  it('each entry has required fields', () => {
    for (const [type, style] of Object.entries(RELATION_STYLES)) {
      expect(style.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(['solid', 'dashed']).toContain(style.lineStyle);
      expect(typeof style.arrow).toBe('boolean');
      expect(style.category).toBeTruthy();
      expect(style.label).toBeTruthy();
    }
  });
});
