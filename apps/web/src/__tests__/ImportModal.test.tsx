import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { ImportModal } from '../components/ImportModal';
import { Controls } from '../components/Controls';
import { SetupModal } from '../components/SetupModal';
import { DEFAULTS } from '../engine';

describe('ImportModal and Import Integration', () => {
  it('renders ImportModal dialog with title, dropzone, and accessible attributes', () => {
    const html = renderToString(
      <ImportModal onClose={vi.fn()} onReplay={vi.fn()} onSimulate={vi.fn()} />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('data-testid="import-modal"');
    expect(html).toContain('Import Simulation Run');
    expect(html).toContain('data-testid="import-dropzone"');
    expect(html).toContain('Supports .json and .csv formats');
    expect(html).toContain('data-testid="close-import-btn"');
  });

  it('renders Controls with Import button when onOpenImport is provided', () => {
    const htmlWithImport = renderToString(
      <Controls
        playing={false}
        done={false}
        speed={2}
        onTogglePlay={vi.fn()}
        onStepOnce={vi.fn()}
        onNewRun={vi.fn()}
        onSetSpeed={vi.fn()}
        onOpenImport={vi.fn()}
      />
    );

    expect(htmlWithImport).toContain('data-testid="import-btn"');
    expect(htmlWithImport).toContain('Import');

    const htmlWithoutImport = renderToString(
      <Controls
        playing={false}
        done={false}
        speed={2}
        onTogglePlay={vi.fn()}
        onStepOnce={vi.fn()}
        onNewRun={vi.fn()}
        onSetSpeed={vi.fn()}
      />
    );

    expect(htmlWithoutImport).not.toContain('data-testid="import-btn"');
  });

  it('renders SetupModal with import link when onOpenImport is provided', () => {
    const htmlWithImport = renderToString(
      <SetupModal getParams={() => ({ ...DEFAULTS })} onStart={vi.fn()} onOpenImport={vi.fn()} />
    );

    expect(htmlWithImport).toContain('data-testid="open-import-from-setup-btn"');
    expect(htmlWithImport).toContain('Or import a previous run (.json / .csv)');

    const htmlWithoutImport = renderToString(
      <SetupModal getParams={() => ({ ...DEFAULTS })} onStart={vi.fn()} />
    );

    expect(htmlWithoutImport).not.toContain('data-testid="open-import-from-setup-btn"');
  });
});
