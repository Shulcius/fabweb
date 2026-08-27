# Модуль costing — Калькулятор 3D-печати и гравировки

> Спецификация расчёта стоимости, извлечённая из reference implementation.
> Валюта: RUB (₽). Тариф электроэнергии: **8 ₽/кВт·ч**.

---

## 1. Общая формула

```
total_cost = Σ(статьи затрат)
final_price = total_cost × (1 + markup_pct / 100)
```

Каждый WorkOrder сохраняет `cost_breakdown` — массив строк детализации + итог.

---

## 2. Глобальные константы

```typescript
const RATES = {
  electricity: 8.0,           // ₽/кВт·ч

  modeling: 300.0,            // ₽/ч — моделирование (FDM, SLA)
  design: 300.0,              // ₽/ч — дизайн/подготовка (Laser)
  painting: 400.0,            // ₽/ч — покраска (SLA)

  default_markup_pct: 50.0,
};
```

---

## 3. FDM (K1 Max)

### 3.1 Константы станка

```typescript
const FDM = {
  power_kw: 0.35,
  power_cost_per_hour: 2.80,    // 0.35 × 8
  amort_per_hour: 18.75,
  consumables_per_hour: 3.33,   // износ сопла и т.д. (10 ₽ / 3ч)
  filament_diameter_cm: 0.175,
};
```

### 3.2 Плотности материалов (г/см³)

```typescript
const FILAMENT_DENSITY: Record<string, number> = {
  'PLA': 1.24,
  'ABS': 1.04,
  'PETG': 1.27,
  'TPU': 1.21,
  'PA (нейлон)': 1.52,
  'PC': 1.30,
  'ASA': 1.07,
  'PET': 1.38,
  'PP': 0.90,
  'HIPS': 1.03,
  'PVA': 1.23,
  'PLA-CF': 1.30,
  'PA-CF': 1.15,
  'PET-CF': 1.30,
  'Wood': 1.28,
};
```

### 3.3 Входные параметры

| Параметр | Тип | Default | Описание |
|----------|-----|---------|----------|
| `material_price_per_kg` | number | 1500 | Цена пластика ₽/кг |
| `calc_type` | `'weight' \| 'length'` | weight | Способ расчёта материала |
| `weight_g` | number | 50 | Вес (г), если calc_type=weight |
| `length_m` | number | 15 | Длина филамента (м), если calc_type=length |
| `material` | string | PLA | Тип материала |
| `print_hours` | number | 3 | Время печати (ч) |
| `print_minutes` | number | 0 | Время печати (мин) |
| `modeling_hours` | number | 1 | Часы моделирования |
| `markup_pct` | number | 50 | Наценка % |

### 3.4 Расчёт

```typescript
function calcFDM(input: FDMInput): CostBreakdown {
  const time_hours = input.print_hours + input.print_minutes / 60;
  const density = FILAMENT_DENSITY[input.material] ?? 1.24;

  let weight_g: number;
  if (input.calc_type === 'weight') {
    weight_g = input.weight_g;
  } else {
    const radius_cm = FDM.filament_diameter_cm / 2;
    const volume_cm3 = Math.PI * radius_cm ** 2 * (input.length_m * 100);
    weight_g = volume_cm3 * density;
  }

  const material_cost = (weight_g / 1000) * input.material_price_per_kg;
  const electricity_cost = time_hours * FDM.power_cost_per_hour;
  const amort_cost = time_hours * FDM.amort_per_hour;
  const consumables_cost = time_hours * FDM.consumables_per_hour;
  const modeling_cost = input.modeling_hours * RATES.modeling;

  const total_cost = material_cost + electricity_cost + amort_cost
                   + consumables_cost + modeling_cost;
  const markup_amount = total_cost * (input.markup_pct / 100);
  const final_price = total_cost + markup_amount;

  return {
    lines: [
      { key: 'material', label: 'Материал (пластик)', amount: material_cost },
      { key: 'electricity', label: 'Электричество', amount: electricity_cost },
      { key: 'amortization', label: 'Амортизация оборудования', amount: amort_cost },
      { key: 'consumables', label: 'Расходники (сопло/трубка)', amount: consumables_cost },
      ...(modeling_cost > 0 ? [{ key: 'modeling', label: 'Моделирование', amount: modeling_cost }] : []),
      { key: 'cost', label: 'Себестоимость', amount: total_cost },
      { key: 'markup', label: `Наценка (${input.markup_pct}%)`, amount: markup_amount },
    ],
    total_cost,
    final_price,
    weight_g,  // для auto-spисания со склада
  };
}
```

---

## 4. SLA (M7 Max)

### 4.1 Константы станка

```typescript
const SLA = {
  printer_power_kw: 0.15,
  printer_power_cost_per_hour: 1.20,  // 0.15 × 8
  wash_cost_fixed: 0.24,              // промывка ~0.03 кВт·ч × 8
  amort_per_hour: 18.75,
  consumables_fixed: 15.0,            // IPA + FEP за job
};
```

### 4.2 Входные параметры

| Параметр | Тип | Default | Описание |
|----------|-----|---------|----------|
| `resin_price_per_l` | number | 3500 | Цена смолы ₽/л |
| `volume_ml` | number | 55 | Объём смолы (мл) |
| `print_hours` | number | 3 | Время печати |
| `print_minutes` | number | 0 | |
| `painting_hours` | number | 0.5 | Покраска |
| `modeling_hours` | number | 1 | Моделирование |
| `markup_pct` | number | 50 | Наценка % |

### 4.3 Расчёт

```typescript
function calcSLA(input: SLAInput): CostBreakdown {
  const time_hours = input.print_hours + input.print_minutes / 60;

  const material_cost = (input.volume_ml / 1000) * input.resin_price_per_l;
  const printer_electricity = time_hours * SLA.printer_power_cost_per_hour;
  const wash_electricity = SLA.wash_cost_fixed;
  const electricity_cost = printer_electricity + wash_electricity;
  const amort_cost = time_hours * SLA.amort_per_hour;
  const consumables_cost = SLA.consumables_fixed;
  const modeling_cost = input.modeling_hours * RATES.modeling;
  const painting_cost = input.painting_hours * RATES.painting;

  const total_cost = material_cost + electricity_cost + amort_cost
                   + consumables_cost + modeling_cost + painting_cost;
  const markup_amount = total_cost * (input.markup_pct / 100);
  const final_price = total_cost + markup_amount;

  return {
    lines: [
      { key: 'material', label: 'Фотополимер', amount: material_cost },
      { key: 'electricity_printer', label: 'Электричество (принтер)', amount: printer_electricity },
      { key: 'electricity_wash', label: 'Электричество (промывка)', amount: wash_electricity },
      { key: 'amortization', label: 'Амортизация оборудования', amount: amort_cost },
      { key: 'consumables', label: 'Расходники (IPA / FEP)', amount: consumables_cost },
      ...(modeling_cost > 0 ? [{ key: 'modeling', label: 'Моделирование', amount: modeling_cost }] : []),
      ...(painting_cost > 0 ? [{ key: 'painting', label: 'Покраска', amount: painting_cost }] : []),
      { key: 'cost', label: 'Себестоимость', amount: total_cost },
      { key: 'markup', label: `Наценка (${input.markup_pct}%)`, amount: markup_amount },
    ],
    total_cost,
    final_price,
    volume_ml: input.volume_ml,
  };
}
```

---

## 5. Laser (Falcon A1)

### 5.1 Константы станка

```typescript
const LASER = {
  base_power_cost_per_hour: 0.60,   // при 70% мощности
  amort_per_hour: 12.0,
  consumables_base_per_hour: 2.0,   // при 70% мощности
  reference_power_pct: 70,
};
```

### 5.2 Входные параметры

| Параметр | Тип | Default | Описание |
|----------|-----|---------|----------|
| `blank_cost` | number | 100 | Цена заготовки ₽ |
| `cut_hours` | number | 1 | Время гравировки (ч) |
| `cut_minutes` | number | 30 | |
| `power_pct` | number | 70 | Мощность лазера % |
| `design_hours` | number | 0.5 | Дизайн/подготовка |
| `markup_pct` | number | 50 | Наценка % |

### 5.3 Расчёт

```typescript
function calcLaser(input: LaserInput): CostBreakdown {
  const time_hours = input.cut_hours + input.cut_minutes / 60;
  const power_factor = input.power_pct / LASER.reference_power_pct;

  const electricity_cost = time_hours * LASER.base_power_cost_per_hour * power_factor;
  const amort_cost = time_hours * LASER.amort_per_hour;
  const consumables_cost = time_hours * LASER.consumables_base_per_hour * power_factor;
  const design_cost = input.design_hours * RATES.design;

  const total_cost = input.blank_cost + electricity_cost + amort_cost
                   + consumables_cost + design_cost;
  const markup_amount = total_cost * (input.markup_pct / 100);
  const final_price = total_cost + markup_amount;

  return {
    lines: [
      { key: 'blank', label: 'Заготовка', amount: input.blank_cost },
      { key: 'electricity', label: `Электричество (${input.power_pct}%)`, amount: electricity_cost },
      { key: 'amortization', label: 'Амортизация лазера', amount: amort_cost },
      { key: 'consumables', label: `Износ (линза/трубка, ${input.power_pct}%)`, amount: consumables_cost },
      ...(design_cost > 0 ? [{ key: 'design', label: 'Дизайн / подготовка', amount: design_cost }] : []),
      { key: 'cost', label: 'Себестоимость', amount: total_cost },
      { key: 'markup', label: `Наценка (${input.markup_pct}%)`, amount: markup_amount },
    ],
    total_cost,
    final_price,
  };
}
```

---

## 6. Cost Ledger (учёт затрат проекта)

```typescript
interface CostLedgerEntry {
  id: UUID;
  project_id: UUID;
  work_order_id?: UUID;
  type: '3d_print' | 'laser' | 'material' | 'manual';
  breakdown: CostBreakdown;
  final_price: number;
  created_at: Date;
}
```

### Отчёт по проекту за период

```
GET /api/projects/:id/cost-report?from=2026-01-01&to=2026-12-31

Response:
{
  project_id: "...",
  period: { from, to },
  entries: CostLedgerEntry[],
  summary: {
    total_cost: number,
    total_revenue: number,   // sum of final_price
    by_tech: { fdm: number, sla: number, laser: number },
    by_category: { material: number, electricity: number, ... }
  }
}
```

---

## 7. Auto-spисание со склада

При `deduction_mode = 'auto'` и статусе WorkOrder → `done`:

| Tech | Списывается | Количество |
|------|-------------|------------|
| FDM | Филамент (по material) | `weight_g` из расчёта |
| SLA | Смола | `volume_ml` из расчёта |
| Laser | Заготовка | 1 pcs (или по blank_cost → item mapping) |
| All | Расходники (сопло, IPA…) | пропорционально `consumables_cost` / `cost_per_unit` |

При `deduction_mode = 'manual'` — форма для работника с pre-filled значениями из slicer.

---

## 8. Admin: редактирование тарифов

Тарифы (amort, power, rates) хранятся в таблице `cost_config` и редактируются админом без деплоя:

```typescript
interface CostConfig {
  key: string;          // 'fdm.amort_per_hour', 'rates.electricity', etc.
  value: number;
  updated_by: UUID;
  updated_at: Date;
}
```

Калькулятор читает config при каждом расчёте. Fallback — hardcoded defaults из этого документа.

---

*Reference: HTML-калькулятор v1 — интегрирован 2026-08-26*
