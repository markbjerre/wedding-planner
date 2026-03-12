import { useRef } from 'react';
import { useEditorStore } from './store/editor-store';
import { Toolbar } from './components/Toolbar/Toolbar';
import { EditorCanvas } from './components/Canvas/EditorCanvas';
import { Sidebar } from './components/Sidebar/Sidebar';
import { GuestsPage } from './pages/GuestsPage';
import { RoomsPage } from './pages/RoomsPage';
import type Konva from 'konva';

export default function App() {
  const stageRef = useRef<Konva.Stage>(null);
  const view = useEditorStore((s) => s.view);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-stone-100">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-hidden">
          {view === 'editor' && <EditorCanvas stageRef={stageRef} />}
          {view === 'guests' && <GuestsPage />}
          {view === 'rooms' && <RoomsPage />}
        </main>
        <Sidebar stageRef={stageRef} />
      </div>
    </div>
  );
}
