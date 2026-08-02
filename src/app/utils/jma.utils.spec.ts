import { getJindoBadgeStyle, getJindoString, getIntensityColor, getJindoFromColor } from './jma.utils';

describe('jma.utils', () => {
  it('should return correct badge style for JMA scale 60 (진도 7)', () => {
    const style = getJindoBadgeStyle(60);
    expect(style.label).toBe('진도 7');
  });

  it('should format JMA scale string', () => {
    expect(getJindoString(45)).toBe('5弱');
  });

  it('should return intensity color', () => {
    expect(getIntensityColor(60)).toBe('#990099');
  });

  it('should parse black as -3 jindo', () => {
    expect(getJindoFromColor(0, 0, 0)).toBe(-3);
  });
});
