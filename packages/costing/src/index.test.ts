import { describe, expect, it } from 'vitest';
import { calcFDM, calcSLA, calcLaser, calculateCost } from './index';

describe('calcFDM', () => {
  it('calculates by weight with default example values', () => {
    const result = calcFDM({
      material_price_per_kg: 1500,
      calc_type: 'weight',
      weight_g: 50,
      material: 'PLA',
      print_hours: 3,
      print_minutes: 0,
      modeling_hours: 1,
      markup_pct: 50,
    });

    expect(result.weight_g).toBe(50);
    expect(result.lines.find((l) => l.key === 'material')?.amount).toBe(75);
    expect(result.final_price).toBeGreaterThan(result.total_cost);
  });
});

describe('calcSLA', () => {
  it('calculates resin cost', () => {
    const result = calcSLA({
      resin_price_per_l: 3500,
      volume_ml: 55,
      print_hours: 3,
      print_minutes: 0,
      painting_hours: 0.5,
      modeling_hours: 1,
      markup_pct: 50,
    });

    expect(result.volume_ml).toBe(55);
    expect(result.lines.find((l) => l.key === 'material')?.amount).toBeCloseTo(192.5);
  });
});

describe('calcLaser', () => {
  it('scales electricity by power factor', () => {
    const result = calcLaser({
      blank_cost: 100,
      cut_hours: 1,
      cut_minutes: 30,
      power_pct: 70,
      design_hours: 0.5,
      markup_pct: 50,
    });

    expect(result.total_cost).toBeGreaterThan(100);
  });
});

describe('calculateCost', () => {
  it('dispatches by tech', () => {
    const result = calculateCost({
      tech: 'fdm',
      material_price_per_kg: 1500,
      calc_type: 'weight',
      weight_g: 10,
      material: 'PLA',
      print_hours: 1,
      print_minutes: 0,
      modeling_hours: 0,
      markup_pct: 0,
    });

    expect(result.final_price).toBe(result.total_cost);
  });
});
