import { ListIcon, BarChart3Icon, UsersIcon } from '../icons';

export type WorkspaceTab = 'tasks' | 'dashboard' | 'members';

interface WorkspaceTabsProps {
  activeTab: WorkspaceTab;
  onChangeTab: (tab: WorkspaceTab) => void;
  tasksCount: number;
  membersCount: number;
}

export function WorkspaceTabs({
  activeTab,
  onChangeTab,
  tasksCount,
  membersCount,
}: WorkspaceTabsProps) {
  return (
    <div className="tf-workspace-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'tasks'}
        className={`tf-workspace-tab ${activeTab === 'tasks' ? 'active' : ''}`}
        onClick={() => onChangeTab('tasks')}
      >
        <ListIcon size={16} />
        <span>Công việc</span>
        <span className="tf-tab-counter">{tasksCount}</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'dashboard'}
        className={`tf-workspace-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => onChangeTab('dashboard')}
      >
        <BarChart3Icon size={16} />
        <span>Tổng quan (Dashboard)</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'members'}
        className={`tf-workspace-tab ${activeTab === 'members' ? 'active' : ''}`}
        onClick={() => onChangeTab('members')}
      >
        <UsersIcon size={16} />
        <span>Thành viên</span>
        <span className="tf-tab-counter">{membersCount}</span>
      </button>
    </div>
  );
}
