import type { AuthUser } from '../lib/api';
import { ROLE_LABELS } from '../lib/labels';

interface Props {
  user: AuthUser;
}

export function DashboardPage({ user }: Props) {
  return (
    <div className="page-grid">
      <section className="card stat-card">
        <h3>Добро пожаловать</h3>
        <p className="stat-card__value">{user.full_name}</p>
        <p className="stat-card__hint">Роль: {ROLE_LABELS[user.role] ?? user.role}</p>
      </section>
      <section className="card stat-card">
        <h3>Модули</h3>
        <p className="stat-card__hint">
          Проекты КБ · Пользователи · Витрина
        </p>
        <p className="stat-card__hint muted">Калькулятор 3D — скоро</p>
      </section>
      <section className="card stat-card wide">
        <h3>Быстрый старт</h3>
        <ol className="quick-start">
          <li>Перейдите в «Проекты КБ» и создайте новый проект</li>
          <li>Отправьте на проверку — научный руководитель одобрит</li>
          <li>После завершения опубликуйте в витрину для гостей</li>
        </ol>
      </section>
    </div>
  );
}
