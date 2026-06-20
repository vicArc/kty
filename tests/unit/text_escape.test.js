import { describe, it, expect } from 'vitest';
import { escapeLatex, Text } from '../../src/mobject/svg/text_mobject.js';

describe('escapeLatex', () => {
  it('maps accents to macros, drops inverted punctuation, … to periods', () => {
    expect(escapeLatex('intercámbialos')).toBe("interc\\'ambialos");
    expect(escapeLatex('Sí')).toBe("S\\'i");
    expect(escapeLatex('señor')).toBe('se\\~nor');
    expect(escapeLatex('Inicio…')).toBe('Inicio...');
    // ¿ ¡ have no CM glyph — dropped (closing ? ! remain).
    expect(escapeLatex('¡Sí!')).toBe("S\\'i!");
    expect(escapeLatex('¿Sí?')).toBe("S\\'i?");
  });

  it('still escapes TeX-special characters', () => {
    expect(escapeLatex('50% & #1')).toBe('50\\% \\& \\#1');
  });

  it('leaves plain ASCII untouched', () => {
    expect(escapeLatex('Compare 5 and -2')).toBe('Compare 5 and -2');
  });

  it('renders accented text without throwing (full glyph run)', () => {
    const t = new Text('intercámbialos');
    const glyphs = t.getFamily().filter((m) => m.hasPoints && m.hasPoints());
    expect(glyphs.length).toBeGreaterThanOrEqual(13); // every letter incl. á
  });
});
