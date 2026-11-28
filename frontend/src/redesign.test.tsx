import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TaskRow } from './components/tasks/TaskRow';
import { DashboardPanel } from './components/dashboard/DashboardPanel';
import { MembersPanel } from './components/members/MembersPanel';
import type { ProjectMetrics, ProjectMember, Task } from './types';

afterEach(() => {
  cleanup();
});

const mockTasks: Task[] = [
  {
    id: 'task-1',
    projectId: 'proj-1',
    parentTaskId: null,
    assigneeId: 'user-1',
    title: 'Xây dựng Design System',
    description: 'Thiết kế các component UI chuẩn SaaS',
    status: 'TODO',
    priority: 'HIGH',
    dueAt: '2026-12-01T00:00:00.000Z',
    deletedAt: null,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    assignee: { id: 'user-1', name: 'Nguyễn Văn A', email: 'a@example.com' },
    subTasks: [
      {
        id: 'sub-1',
        projectId: 'proj-1',
        parentTaskId: 'task-1',
        assigneeId: null,
        title: 'Tạo Color Palette',
        description: null,
        status: 'DONE',
        priority: 'MEDIUM',
        dueAt: null,
        deletedAt: null,
        createdAt: '2026-11-01T00:00:00.000Z',
        updatedAt: '2026-11-01T00:00:00.000Z',
        assignee: null,
      },
    ],
  },
];

const mockMembers: ProjectMember[] = [
  {
    projectId: 'proj-1',
    userId: 'user-1',
    role: 'OWNER',
    joinedAt: '2026-10-01T00:00:00.000Z',
    user: { id: 'user-1', name: 'Nguyễn Văn A', email: 'a@example.com' },
  },
  {
    projectId: 'proj-1',
    userId: 'user-2',
    role: 'MEMBER',
    joinedAt: '2026-10-02T00:00:00.000Z',
    user: { id: 'user-2', name: 'Trần Thị B', email: 'b@example.com' },
  },
];

describe('TaskRow list component', () => {
  it('renders task row details properly', () => {
    const onSelect = vi.fn();
    const onChanged = vi.fn();

    render(
      <TaskRow
        task={mockTasks[0]}
        selected={false}
        deleted={false}
        canEdit={true}
        onSelect={onSelect}
        onChanged={onChanged}
        projectId="proj-1"
      />,
    );

    expect(screen.getByText('Xây dựng Design System')).toBeInTheDocument();
    expect(screen.getByText('Thiết kế các component UI chuẩn SaaS')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Xây dựng Design System'));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});

describe('MembersPanel component', () => {
  it('renders member roster and allows owner management actions', () => {
    const onChanged = vi.fn();

    render(
      <MembersPanel
        projectId="proj-1"
        members={mockMembers}
        currentUserId="user-1"
        canManage={true}
        onChanged={onChanged}
      />,
    );

    expect(screen.getByText('Thành viên dự án')).toBeInTheDocument();
    expect(screen.getAllByText('Nguyễn Văn A').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Trần Thị B').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Mời thành viên mới')).toBeInTheDocument();
  });
});

describe('DashboardPanel component', () => {
  it('fetches metrics and renders cards', async () => {
    const mockMetrics: ProjectMetrics = {
      tasks: {
        total: 10,
        byStatus: { TODO: 4, IN_PROGRESS: 3, DONE: 2, BLOCKED: 1 },
        byPriority: { LOW: 2, MEDIUM: 5, HIGH: 2, URGENT: 1 },
        overdue: 1,
        dueSoon: 2,
        completionRate: 20,
      },
      members: {
        total: 2,
        breakdown: [
          {
            userId: 'user-1',
            name: 'Nguyễn Văn A',
            email: 'a@example.com',
            role: 'OWNER',
            assignedTasks: 5,
            completedTasks: 2,
            overdueTasks: 0,
          },
        ],
      },
      activity: {
        totalComments: 8,
        totalAttachments: 3,
      },
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockMetrics), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );

    const onNavigateToTasks = vi.fn();

    render(
      <DashboardPanel
        projectId="proj-1"
        onNavigateToTasks={onNavigateToTasks}
      />,
    );

    expect(await screen.findByText('Tổng quan dự án')).toBeInTheDocument();
    expect(screen.getByText('Tiến độ tổng thể dự án')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
    expect(screen.getByText('8 bình luận')).toBeInTheDocument();
  });
});
