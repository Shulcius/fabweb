import {
  ConnectorType,
  MachineStatus,
  MachineType,
  PrismaClient,
  ProjectStatus,
  ProjectType,
  UserRole,
} from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const users = [
  {
    email: 'admin@fab.local',
    password: 'admin123',
    full_name: 'Администратор',
    role: UserRole.admin,
    micro_roles: [] as string[],
  },
  {
    email: 'worker@fab.local',
    password: 'worker123',
    full_name: 'Инженер Иванов',
    role: UserRole.worker,
    micro_roles: ['constructor', 'programmer'],
  },
  {
    email: 'supervisor@fab.local',
    password: 'supervisor123',
    full_name: 'Научный руководитель Петров',
    role: UserRole.supervisor,
    micro_roles: ['constructor'],
  },
  {
    email: 'guest@fab.local',
    password: 'guest123',
    full_name: 'Гость',
    role: UserRole.guest,
    micro_roles: [] as string[],
  },
];

/** Парк площадки — заглушки коннекторов, интеграция позже */
const machines = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'K1 Max',
    type: MachineType.fdm_printer,
    model: 'Creality K1 Max',
    purpose: 'FDM печать крупных деталей',
    capabilities: {
      materials: ['PLA', 'PETG', 'ABS', 'ASA', 'TPU'],
      max_temp_c: 300,
      bed_size: { x: 300, y: 300, z: 300 },
    },
    connector_type: ConnectorType.moonraker,
    connector_port: 7125 as number | null,
    integration_status: 'planned',
    image_url: '/machines/k1-max.png',
    notes: 'План: Moonraker на принтере. Эталон полного контура (файл/стоп/live).',
    sort_order: 1,
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    name: 'Kobra Combo #1',
    type: MachineType.fdm_printer,
    model: 'Anycubic Kobra S1 Combo',
    purpose: 'FDM печать / мультиматериал',
    capabilities: {
      materials: ['PLA', 'PETG', 'ABS', 'TPU'],
      max_temp_c: 260,
      bed_size: { x: 220, y: 220, z: 250 },
    },
    connector_type: ConnectorType.octoprint,
    connector_port: null,
    integration_status: 'planned',
    image_url: '/machines/kobra-combo.png',
    notes: 'План: USB→OctoPrint на Pi или Klipper. Сток Anycubic API слабый.',
    sort_order: 2,
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    name: 'Kobra Combo #2',
    type: MachineType.fdm_printer,
    model: 'Anycubic Kobra S1 Combo',
    purpose: 'FDM печать / мультиматериал',
    capabilities: {
      materials: ['PLA', 'PETG', 'ABS', 'TPU'],
      max_temp_c: 260,
      bed_size: { x: 220, y: 220, z: 250 },
    },
    connector_type: ConnectorType.octoprint,
    connector_port: null,
    integration_status: 'planned',
    image_url: '/machines/kobra-combo.png',
    notes: 'Вторая Kobra — тот же стек, что #1.',
    sort_order: 3,
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    name: 'Photon M7 Max',
    type: MachineType.resin_printer,
    model: 'Anycubic Photon Mono M7 Max',
    purpose: 'SLA / фотополимер',
    capabilities: {
      materials: ['Стандартная смола', 'ABS-like', 'Tough'],
      bed_size: { x: 298, y: 164, z: 300 },
    },
    connector_type: ConnectorType.custom,
    connector_port: null,
    integration_status: 'stub',
    image_url: '/machines/photon-m7-max.png',
    notes: 'Сток API ограничен. v1: файл+старт/manual status + внешняя камера.',
    sort_order: 4,
  },
  {
    id: '10000000-0000-4000-8000-000000000005',
    name: 'Falcon A1',
    type: MachineType.laser,
    model: 'Creality Falcon A1 Pro',
    purpose: 'Лазерная резка / гравировка',
    capabilities: {
      materials: ['фанера', 'акрил', 'кожа', 'бумага'],
      bed_size: { x: 400, y: 400, z: 0 },
      max_power_pct: 100,
    },
    connector_type: ConnectorType.manual,
    connector_port: null,
    integration_status: 'stub',
    image_url: '/machines/falcon-a1.png',
    notes: 'Интеграция позже. Пока только реестр + ручной статус.',
    sort_order: 5,
  },
  {
    id: '10000000-0000-4000-8000-000000000006',
    name: 'Wash & Cure 3',
    type: MachineType.wash,
    model: 'Anycubic Wash & Cure 3.0',
    purpose: 'Промывка и УФ-засветка SLA',
    capabilities: {
      materials: ['IPA', 'постобработка смолы'],
      bed_size: { x: 0, y: 0, z: 0 },
    },
    connector_type: ConnectorType.manual,
    connector_port: null,
    integration_status: 'stub',
    image_url: '/machines/wash-cure.png',
    notes: 'Постобработка Photon. Статус вручную / позже MQTT-розетка.',
    sort_order: 6,
  },
  {
    id: '10000000-0000-4000-8000-000000000007',
    name: 'Filament Dryer',
    type: MachineType.accessory,
    model: 'Space Pi Filament Dryer Plus',
    purpose: 'Сушка филамента',
    capabilities: {
      materials: ['PLA', 'PETG', 'ABS', 'Nylon', 'TPU'],
      bed_size: { x: 0, y: 0, z: 0 },
    },
    connector_type: ConnectorType.manual,
    connector_port: null,
    integration_status: 'stub',
    image_url: '/machines/filament-dryer.webp',
    notes: 'Аксессуар FDM. Интеграция не приоритет.',
    sort_order: 7,
  },
];

async function main() {
  for (const u of users) {
    const password_hash = await hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password_hash,
        full_name: u.full_name,
        role: u.role,
        micro_roles: u.micro_roles,
      },
      create: {
        email: u.email,
        password_hash,
        full_name: u.full_name,
        role: u.role,
        micro_roles: u.micro_roles,
      },
    });
  }

  console.log('Seed OK:', users.map((u) => u.email).join(', '));

  const worker = await prisma.user.findUnique({ where: { email: 'worker@fab.local' } });
  if (worker) {
    await prisma.project.upsert({
      where: { id: '00000000-0000-4000-8000-000000000001' },
      update: {
        summary: 'IoT-датчик влажности для мониторинга микроклимата в цехе',
        description:
          'Комплексное устройство: печатная плата на ESP32, 3D-печатный корпус, прошивка с отправкой данных по Wi-Fi.',
        goals: 'Автоматический мониторинг влажности и оповещение при отклонениях.',
        tags: ['IoT', 'ESP32', '3D-печать'],
        settings: {
          intended_use: 'Мониторинг микроклимата',
          disciplines: ['constructor', 'electronics', 'programmer'],
          needs_3d_print: true,
        },
      },
      create: {
        id: '00000000-0000-4000-8000-000000000001',
        title: 'Датчик влажности IoT',
        summary: 'IoT-датчик влажности для мониторинга микроклимата в цехе',
        description:
          'Комплексное устройство: печатная плата на ESP32, 3D-печатный корпус, прошивка с отправкой данных по Wi-Fi.',
        goals: 'Автоматический мониторинг влажности и оповещение при отклонениях.',
        tags: ['IoT', 'ESP32', '3D-печать'],
        settings: {
          intended_use: 'Мониторинг микроклимата',
          disciplines: ['constructor', 'electronics', 'programmer'],
          needs_3d_print: true,
        },
        type: ProjectType.mixed,
        status: ProjectStatus.completed,
        owner_id: worker.id,
        showcase_published: true,
        showcase_description: 'Готовый IoT-датчик для мониторинга влажности в цехе',
      },
    });
    console.log('Demo project seeded for showcase');
  }

  for (const m of machines) {
    await prisma.machine.upsert({
      where: { id: m.id },
      update: {
        name: m.name,
        type: m.type,
        model: m.model,
        purpose: m.purpose,
        capabilities: m.capabilities,
        connector_type: m.connector_type,
        connector_port: m.connector_port,
        integration_status: m.integration_status,
        image_url: m.image_url,
        notes: m.notes,
        sort_order: m.sort_order,
        enabled: true,
      },
      create: {
        id: m.id,
        name: m.name,
        type: m.type,
        model: m.model,
        purpose: m.purpose,
        capabilities: m.capabilities,
        connector_type: m.connector_type,
        connector_port: m.connector_port,
        integration_status: m.integration_status,
        image_url: m.image_url,
        notes: m.notes,
        sort_order: m.sort_order,
        status: MachineStatus.offline,
        enabled: true,
      },
    });
  }
  console.log('Machines seeded:', machines.map((m) => m.name).join(', '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
