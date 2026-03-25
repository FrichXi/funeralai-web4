import { describe, expect, it } from 'vitest';
import { tableContainerVariants } from './table-contracts';

describe('tableContainerVariants', () => {
  it('defaults to centered intrinsic layout', () => {
    const classes = tableContainerVariants();
    expect(classes).toContain('w-fit');
    expect(classes).toContain('justify-center');
  });

  it('supports fill layout explicitly', () => {
    const classes = tableContainerVariants({ layout: 'fill' });
    expect(classes).toContain('w-full');
  });

  it('supports start alignment explicitly', () => {
    const classes = tableContainerVariants({ align: 'start' });
    expect(classes).toContain('justify-start');
  });
});
