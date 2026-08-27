import { useState } from 'react';
import type { ProjectType } from '@fabweb/shared';
import { api } from '../lib/api';
import { MICRO_ROLE_LABELS } from '../lib/labels';
import type { CreateProjectPayload, PendingUpload, ProjectDetail } from '../lib/projects';
import {
  ASSET_KIND_LABELS,
  PROJECT_TYPE_LABELS,
  uploadProjectAsset,
} from '../lib/projects';
import './ProjectCreatePage.css';

const DISCIPLINES = [
  { id: 'constructor', label: 'Конструктор' },
  { id: 'electronics', label: 'Электронщик' },
  { id: 'programmer', label: 'Программист' },
];

interface Props {
  token: string;
  onCreated: (projectId: string) => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}

type Step = 1 | 2 | 3 | 4;

export function ProjectCreatePage({ token, onCreated, onCancel, onError }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<ProjectType>('device');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState('');
  const [parentId, setParentId] = useState('');

  const [description, setDescription] = useState('');
  const [goals, setGoals] = useState('');
  const [intendedUse, setIntendedUse] = useState('');
  const [disciplines, setDisciplines] = useState<string[]>(['constructor']);
  const [needs3d, setNeeds3d] = useState(false);
  const [materialNotes, setMaterialNotes] = useState('');
  const [targetPlatform, setTargetPlatform] = useState('');

  const [uploads, setUploads] = useState<PendingUpload[]>([]);
  const [uploadKind, setUploadKind] = useState<keyof typeof ASSET_KIND_LABELS>('photo');

  function toggleDiscipline(id: string) {
    setDisciplines((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  }

  function handleFilesSelected(files: FileList | null) {
    if (!files?.length) return;
    const newUploads: PendingUpload[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      kind: uploadKind,
      title: file.name.replace(/\.[^.]+$/, ''),
      description: '',
      is_cover: uploadKind === 'photo' && uploads.filter((u) => u.kind === 'photo').length === 0,
    }));
    setUploads((prev) => [...prev, ...newUploads]);
  }

  function removeUpload(id: string) {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }

  function setCover(id: string) {
    setUploads((prev) =>
      prev.map((u) => ({
        ...u,
        is_cover: u.kind === 'photo' && u.id === id,
      })),
    );
  }

  async function handleCreate() {
    setSaving(true);
    onError('');
    try {
      const payload: CreateProjectPayload = {
        title: title.trim(),
        summary: summary.trim(),
        description: description.trim(),
        goals: goals.trim(),
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        type,
        domain: 'design_bureau',
        settings: {
          intended_use: intendedUse.trim(),
          disciplines,
          needs_3d_print: needs3d,
          material_notes: materialNotes.trim(),
          target_platform: targetPlatform.trim(),
        },
        ...(parentId.trim() && { parent_project_id: parentId.trim() }),
      };

      const project = await api<ProjectDetail>('/api/v1/projects', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, token);

      for (const upload of uploads) {
        await uploadProjectAsset(token, project.id, upload);
      }

      onCreated(project.id);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Ошибка создания');
    } finally {
      setSaving(false);
    }
  }

  const canNext1 = title.trim().length >= 2 && summary.trim().length >= 10;
  const canNext2 = description.trim().length >= 20;
  const canCreate = uploads.length > 0 && uploads.some((u) => u.kind === 'photo');

  return (
    <div className="project-wizard">
      <div className="wizard-header">
        <div>
          <h2>Новый проект</h2>
          <p className="muted">Шаг {step} из 4</p>
        </div>
        <button type="button" className="btn" onClick={onCancel}>
          Отмена
        </button>
      </div>

      <div className="wizard-steps">
        {(['Основное', 'Описание', 'Файлы', 'Обзор'] as const).map((label, i) => (
          <div key={label} className={`wizard-step ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`}>
            <span>{i + 1}</span> {label}
          </div>
        ))}
      </div>

      {step === 1 && (
        <section className="card wizard-panel">
          <h3>Основная информация</h3>
          <div className="form-grid">
            <label className="full">
              Название проекта *
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Датчик влажности IoT" />
            </label>
            <label>
              Тип проекта *
              <select value={type} onChange={(e) => setType(e.target.value as ProjectType)}>
                {Object.entries(PROJECT_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
            <label>
              Теги (через запятую)
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="IoT, ESP32, 3D" />
            </label>
            <label className="full">
              Краткое описание * (мин. 10 символов)
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                placeholder="Одно предложение — суть проекта"
              />
            </label>
            <label className="full">
              ID родительского проекта (ветка, необязательно)
              <input value={parentId} onChange={(e) => setParentId(e.target.value)} placeholder="идентификатор родителя" />
            </label>
          </div>
          <div className="wizard-actions">
            <button type="button" className="btn btn-primary" disabled={!canNext1} onClick={() => setStep(2)}>
              Далее
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="card wizard-panel">
          <h3>Описание и настройки</h3>
          <div className="form-grid">
            <label className="full">
              Полное описание * (мин. 20 символов)
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Подробно: назначение, состав, особенности…"
              />
            </label>
            <label className="full">
              Цели и задачи
              <textarea value={goals} onChange={(e) => setGoals(e.target.value)} rows={3} />
            </label>
            <label className="full">
              Назначение / область применения
              <input value={intendedUse} onChange={(e) => setIntendedUse(e.target.value)} />
            </label>
            <label className="full">
              Задействованные дисциплины
              <div className="chip-group">
                {DISCIPLINES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={disciplines.includes(d.id) ? 'chip active' : 'chip'}
                    onClick={() => toggleDiscipline(d.id)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </label>
            <label>
              <span className="checkbox-row">
                <input type="checkbox" checked={needs3d} onChange={(e) => setNeeds3d(e.target.checked)} />
                Планируется 3D-печать
              </span>
            </label>
            <label>
              Целевая платформа
              <input value={targetPlatform} onChange={(e) => setTargetPlatform(e.target.value)} placeholder="ESP32, Arduino…" />
            </label>
            <label className="full">
              Заметки по материалам
              <input value={materialNotes} onChange={(e) => setMaterialNotes(e.target.value)} placeholder="PLA, FR4, …" />
            </label>
          </div>
          <div className="wizard-actions">
            <button type="button" className="btn" onClick={() => setStep(1)}>Назад</button>
            <button type="button" className="btn btn-primary" disabled={!canNext2} onClick={() => setStep(3)}>
              Далее
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="card wizard-panel">
          <h3>Файлы и фото</h3>
          <p className="muted">Минимум: 1 фото + любой файл (STL, PDF, Gerber, код…)</p>

          <div className="upload-bar">
            <select value={uploadKind} onChange={(e) => setUploadKind(e.target.value as typeof uploadKind)}>
              {Object.entries(ASSET_KIND_LABELS).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
            <label className="btn btn-primary upload-btn">
              Выбрать файлы
              <input
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  handleFilesSelected(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          {uploads.length === 0 ? (
            <div className="empty-state">Перетащите или выберите файлы</div>
          ) : (
            <ul className="upload-list">
              {uploads.map((u) => (
                <li key={u.id} className="upload-item">
                  <div>
                    <strong>{u.title}</strong>
                    <span className="muted"> · {ASSET_KIND_LABELS[u.kind]} · {(u.file.size / 1024).toFixed(0)} КБ</span>
                    {u.is_cover && <span className="badge">Обложка</span>}
                  </div>
                  <div className="upload-item__actions">
                    {u.kind === 'photo' && !u.is_cover && (
                      <button type="button" className="btn" onClick={() => setCover(u.id)}>Обложка</button>
                    )}
                    <button type="button" className="btn" onClick={() => removeUpload(u.id)}>Удалить</button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="wizard-actions">
            <button type="button" className="btn" onClick={() => setStep(2)}>Назад</button>
            <button type="button" className="btn btn-primary" disabled={!canCreate} onClick={() => setStep(4)}>
              Далее
            </button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="card wizard-panel">
          <h3>Обзор перед созданием</h3>
          <dl className="review-list">
            <dt>Название</dt><dd>{title}</dd>
            <dt>Тип</dt><dd>{PROJECT_TYPE_LABELS[type]}</dd>
            <dt>Кратко</dt><dd>{summary}</dd>
            <dt>Описание</dt><dd>{description}</dd>
            {goals && <><dt>Цели</dt><dd>{goals}</dd></>}
            <dt>Файлов</dt><dd>{uploads.length} (фото: {uploads.filter((u) => u.kind === 'photo').length})</dd>
            <dt>Дисциплины</dt>
            <dd>
              {disciplines.map((d) => MICRO_ROLE_LABELS[d] ?? d).join(', ') || '—'}
            </dd>
          </dl>
          <div className="wizard-actions">
            <button type="button" className="btn" onClick={() => setStep(3)}>Назад</button>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={handleCreate}>
              {saving ? 'Создание…' : 'Создать проект'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
