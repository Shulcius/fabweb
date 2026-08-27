import type { CostBreakdown } from '@fabweb/shared';

export const RATES = {
  electricity: 8.0,
  modeling: 300.0,
  design: 300.0,
  painting: 400.0,
  default_markup_pct: 50.0,
} as const;

export const FDM = {
  power_kw: 0.35,
  power_cost_per_hour: 2.8,
  amort_per_hour: 18.75,
  consumables_per_hour: 3.33,
  filament_diameter_cm: 0.175,
} as const;

export const SLA = {
  printer_power_cost_per_hour: 1.2,
  wash_cost_fixed: 0.24,
  amort_per_hour: 18.75,
  consumables_fixed: 15.0,
} as const;

export const LASER = {
  base_power_cost_per_hour: 0.6,
  amort_per_hour: 12.0,
  consumables_base_per_hour: 2.0,
  reference_power_pct: 70,
} as const;

export const FILAMENT_DENSITY: Record<string, number> = {
  PLA: 1.24,
  ABS: 1.04,
  PETG: 1.27,
  TPU: 1.21,
  'PA (нейлон)': 1.52,
  PC: 1.3,
  ASA: 1.07,
  PET: 1.38,
  PP: 0.9,
  HIPS: 1.03,
  PVA: 1.23,
  'PLA-CF': 1.3,
  'PA-CF': 1.15,
  'PET-CF': 1.3,
  Wood: 1.28,
};

export interface FDMInput {
  material_price_per_kg: number;
  calc_type: 'weight' | 'length';
  weight_g?: number;
  length_m?: number;
  material: string;
  print_hours: number;
  print_minutes: number;
  modeling_hours: number;
  markup_pct: number;
}

export interface SLAInput {
  resin_price_per_l: number;
  volume_ml: number;
  print_hours: number;
  print_minutes: number;
  painting_hours: number;
  modeling_hours: number;
  markup_pct: number;
}

export interface LaserInput {
  blank_cost: number;
  cut_hours: number;
  cut_minutes: number;
  power_pct: number;
  design_hours: number;
  markup_pct: number;
}

function toHours(hours: number, minutes: number): number {
  return hours + minutes / 60;
}

export function calcFDM(input: FDMInput): CostBreakdown {
  const timeHours = toHours(input.print_hours, input.print_minutes);
  const density = FILAMENT_DENSITY[input.material] ?? 1.24;

  let weightG: number;
  if (input.calc_type === 'weight') {
    weightG = input.weight_g ?? 0;
  } else {
    const radiusCm = FDM.filament_diameter_cm / 2;
    const lengthM = input.length_m ?? 0;
    const volumeCm3 = Math.PI * radiusCm ** 2 * (lengthM * 100);
    weightG = volumeCm3 * density;
  }

  const materialCost = (weightG / 1000) * input.material_price_per_kg;
  const electricityCost = timeHours * FDM.power_cost_per_hour;
  const amortCost = timeHours * FDM.amort_per_hour;
  const consumablesCost = timeHours * FDM.consumables_per_hour;
  const modelingCost = input.modeling_hours * RATES.modeling;

  const totalCost =
    materialCost + electricityCost + amortCost + consumablesCost + modelingCost;
  const markupAmount = totalCost * (input.markup_pct / 100);
  const finalPrice = totalCost + markupAmount;

  const lines = [
    { key: 'material', label: 'Материал (пластик)', amount: materialCost },
    { key: 'electricity', label: 'Электричество', amount: electricityCost },
    { key: 'amortization', label: 'Амортизация оборудования', amount: amortCost },
    { key: 'consumables', label: 'Расходники (сопло/трубка)', amount: consumablesCost },
  ];

  if (modelingCost > 0) {
    lines.push({ key: 'modeling', label: 'Моделирование', amount: modelingCost });
  }

  lines.push(
    { key: 'cost', label: 'Себестоимость', amount: totalCost },
    { key: 'markup', label: `Наценка (${input.markup_pct}%)`, amount: markupAmount },
  );

  return { lines, total_cost: totalCost, final_price: finalPrice, weight_g: weightG };
}

export function calcSLA(input: SLAInput): CostBreakdown {
  const timeHours = toHours(input.print_hours, input.print_minutes);

  const materialCost = (input.volume_ml / 1000) * input.resin_price_per_l;
  const printerElectricity = timeHours * SLA.printer_power_cost_per_hour;
  const washElectricity = SLA.wash_cost_fixed;
  const electricityCost = printerElectricity + washElectricity;
  const amortCost = timeHours * SLA.amort_per_hour;
  const consumablesCost = SLA.consumables_fixed;
  const modelingCost = input.modeling_hours * RATES.modeling;
  const paintingCost = input.painting_hours * RATES.painting;

  const totalCost =
    materialCost +
    electricityCost +
    amortCost +
    consumablesCost +
    modelingCost +
    paintingCost;
  const markupAmount = totalCost * (input.markup_pct / 100);
  const finalPrice = totalCost + markupAmount;

  const lines = [
    { key: 'material', label: 'Фотополимер', amount: materialCost },
    { key: 'electricity_printer', label: 'Электричество (принтер)', amount: printerElectricity },
    { key: 'electricity_wash', label: 'Электричество (промывка)', amount: washElectricity },
    { key: 'amortization', label: 'Амортизация оборудования', amount: amortCost },
    { key: 'consumables', label: 'Расходники (IPA / FEP)', amount: consumablesCost },
  ];

  if (modelingCost > 0) {
    lines.push({ key: 'modeling', label: 'Моделирование', amount: modelingCost });
  }
  if (paintingCost > 0) {
    lines.push({ key: 'painting', label: 'Покраска', amount: paintingCost });
  }

  lines.push(
    { key: 'cost', label: 'Себестоимость', amount: totalCost },
    { key: 'markup', label: `Наценка (${input.markup_pct}%)`, amount: markupAmount },
  );

  return { lines, total_cost: totalCost, final_price: finalPrice, volume_ml: input.volume_ml };
}

export function calcLaser(input: LaserInput): CostBreakdown {
  const timeHours = toHours(input.cut_hours, input.cut_minutes);
  const powerFactor = input.power_pct / LASER.reference_power_pct;

  const electricityCost = timeHours * LASER.base_power_cost_per_hour * powerFactor;
  const amortCost = timeHours * LASER.amort_per_hour;
  const consumablesCost = timeHours * LASER.consumables_base_per_hour * powerFactor;
  const designCost = input.design_hours * RATES.design;

  const totalCost =
    input.blank_cost + electricityCost + amortCost + consumablesCost + designCost;
  const markupAmount = totalCost * (input.markup_pct / 100);
  const finalPrice = totalCost + markupAmount;

  const lines = [
    { key: 'blank', label: 'Заготовка', amount: input.blank_cost },
    {
      key: 'electricity',
      label: `Электричество (${input.power_pct}%)`,
      amount: electricityCost,
    },
    { key: 'amortization', label: 'Амортизация лазера', amount: amortCost },
    {
      key: 'consumables',
      label: `Износ (линза/трубка, ${input.power_pct}%)`,
      amount: consumablesCost,
    },
  ];

  if (designCost > 0) {
    lines.push({ key: 'design', label: 'Дизайн / подготовка', amount: designCost });
  }

  lines.push(
    { key: 'cost', label: 'Себестоимость', amount: totalCost },
    { key: 'markup', label: `Наценка (${input.markup_pct}%)`, amount: markupAmount },
  );

  return { lines, total_cost: totalCost, final_price: finalPrice };
}

export type CostInput =
  | ({ tech: 'fdm' } & FDMInput)
  | ({ tech: 'sla' } & SLAInput)
  | ({ tech: 'laser' } & LaserInput);

export function calculateCost(input: CostInput): CostBreakdown {
  switch (input.tech) {
    case 'fdm':
      return calcFDM(input);
    case 'sla':
      return calcSLA(input);
    case 'laser':
      return calcLaser(input);
  }
}
