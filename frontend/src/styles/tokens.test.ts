import { describe, expect, it } from 'vitest';

import baseCss from './base.css?raw';
import colorsCss from './colors.css?raw';
import elevationCss from './elevation.css?raw';
import spacingCss from './spacing.css?raw';
import typographyCss from './typography.css?raw';

const tokenCss = [
  baseCss,
  colorsCss,
  elevationCss,
  spacingCss,
  typographyCss,
].join('\n');

describe('design tokens', () => {
  it('defines every referenced CSS custom property', () => {
    const definitions = new Set(
      [...tokenCss.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((match) => match[1]),
    );
    const references = new Set(
      [...tokenCss.matchAll(/var\((--[a-z0-9-]+)/gi)].map((match) => match[1]),
    );
    const missing = [...references].filter((token) => !definitions.has(token));

    expect(missing).toEqual([]);
  });
});
