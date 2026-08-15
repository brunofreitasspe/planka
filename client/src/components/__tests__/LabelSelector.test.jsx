import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LabelSelector from '../LabelSelector';

describe('LabelSelector Component', () => {
  const mockLabels = [
    { id: 'l1', name: 'Bug', color: 'berry-red', isGlobal: false },
    { id: 'l2', name: 'Feature', color: 'fresh-salad', isGlobal: true, canBeUsedByMembers: true },
    { id: 'l3', name: 'Secret', color: 'dark-granite', isGlobal: true, canBeUsedByMembers: false },
  ];

  it('renders two sections: project and board labels', () => {
    render(
      <LabelSelector
        labels={mockLabels}
        onAdd={() => {}}
        onRemove={() => {}}
        isProjectManager={false}
      />,
    );

    expect(screen.getByText('Etiquetas do Projeto')).toBeInTheDocument();
    expect(screen.getByText('Etiquetas do Quadro')).toBeInTheDocument();
  });

  it('shows globe icon for global labels', () => {
    render(
      <LabelSelector
        labels={mockLabels}
        onAdd={() => {}}
        onRemove={() => {}}
        isProjectManager={false}
      />,
    );

    const globeIcon = screen.getAllByText(/🌐/);
    expect(globeIcon.length).toBeGreaterThan(0);
  });

  it('filters restricted global labels for non-managers', () => {
    render(
      <LabelSelector
        labels={mockLabels}
        onAdd={() => {}}
        onRemove={() => {}}
        isProjectManager={false}
      />,
    );

    expect(screen.getByText('Feature')).toBeInTheDocument();
    expect(screen.queryByText('Secret')).not.toBeInTheDocument();
  });

  it('shows all global labels for managers', () => {
    render(
      <LabelSelector labels={mockLabels} onAdd={() => {}} onRemove={() => {}} isProjectManager />,
    );

    expect(screen.getByText('Feature')).toBeInTheDocument();
    expect(screen.getByText('Secret')).toBeInTheDocument();
  });

  it('shows promote button for managers on local labels', () => {
    render(
      <LabelSelector labels={mockLabels} onAdd={() => {}} onRemove={() => {}} isProjectManager />,
    );

    const promoteButtons = screen.getAllByText(/promover/i);
    expect(promoteButtons.length).toBeGreaterThan(0);
  });

  it('does not show promote button for non-managers', () => {
    render(
      <LabelSelector
        labels={mockLabels}
        onAdd={() => {}}
        onRemove={() => {}}
        isProjectManager={false}
      />,
    );

    expect(screen.queryByText(/promover/i)).not.toBeInTheDocument();
  });

  it('calls onAdd when label is clicked', () => {
    const onAdd = jest.fn();

    render(
      <LabelSelector
        labels={mockLabels}
        onAdd={onAdd}
        onRemove={() => {}}
        isProjectManager={false}
      />,
    );

    fireEvent.click(screen.getByText('Bug'));
    expect(onAdd).toHaveBeenCalledWith('l1');
  });
});
