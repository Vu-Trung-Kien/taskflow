import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { projectApi } from '../api';
import type { Project } from '../types';
import { ProjectsPage } from './ProjectsPage';

vi.mock('../components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

it('shows only projects that match the selected archive view', async () => {
  const createdAt = '2026-11-01T00:00:00Z';
  const active: Project = {
    id: 'active',
    name: 'Dự án đang hoạt động',
    description: null,
    archivedAt: null,
    createdAt,
    updatedAt: createdAt,
    members: [{ role: 'OWNER' }],
  };
  const archived: Project = {
    ...active,
    id: 'archived',
    name: 'Dự án trong kho',
    archivedAt: '2026-11-02T00:00:00Z',
  };
  const list = vi.spyOn(projectApi, 'list').mockImplementation(async (includeArchived) =>
    includeArchived ? [active, archived] : [active],
  );

  try {
    render(<MemoryRouter><ProjectsPage /></MemoryRouter>);

    expect(await screen.findByText(active.name)).toBeInTheDocument();
    expect(screen.queryByText(archived.name)).not.toBeInTheDocument();

    const archiveToggle = screen.getByRole('checkbox', { name: 'Hiện dự án đã lưu trữ' });
    fireEvent.click(archiveToggle);
    expect(await screen.findByText(archived.name)).toBeInTheDocument();
    expect(screen.queryByText(active.name)).not.toBeInTheDocument();

    fireEvent.click(archiveToggle);
    expect(await screen.findByText(active.name)).toBeInTheDocument();
    expect(screen.queryByText(archived.name)).not.toBeInTheDocument();
  } finally {
    list.mockRestore();
  }
});
