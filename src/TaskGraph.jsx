import { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { STATUS_COLORS, isOverdue, isDueSoon } from './store';

function taskToNode(task, index, total) {
  const col = index % 3;
  const row = Math.floor(index / 3);
  const overdue = isOverdue(task.deadline);
  const soon = isDueSoon(task.deadline);

  return {
    id: task.id,
    position: { x: col * 220 + 40, y: row * 130 + 40 },
    data: { label: task.title, task },
    style: {
      background: STATUS_COLORS[task.status] || '#333',
      border: overdue
        ? '2px solid #ef4444'
        : soon
        ? '2px solid #f59e0b'
        : '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10,
      color: '#fff',
      fontSize: 13,
      padding: '10px 14px',
      minWidth: 160,
      boxShadow: overdue
        ? '0 0 12px rgba(239,68,68,0.4)'
        : soon
        ? '0 0 12px rgba(245,158,11,0.4)'
        : 'none',
    },
  };
}

export default function TaskGraph({ tasks, onSelectTask }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const newNodes = tasks.map((t, i) => taskToNode(t, i, tasks.length));
    const newEdges = [];
    tasks.forEach(t => {
      t.deps.forEach(depId => {
        newEdges.push({
          id: `${depId}-${t.id}`,
          source: depId,
          target: t.id,
          animated: t.status === 'doing',
          style: { stroke: '#555' },
          markerEnd: { type: 'arrowclosed', color: '#555' },
        });
      });
    });
    setNodes(newNodes);
    setEdges(newEdges);
  }, [tasks]);

  const onNodeClick = useCallback((_, node) => {
    onSelectTask(node.data.task.id);
  }, [onSelectTask]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        colorMode="dark"
      >
        <Background color="#222" gap={20} />
        <Controls />
        <MiniMap
          nodeColor={n => STATUS_COLORS[n.data?.task?.status] || '#333'}
          style={{ background: '#1a1a1a' }}
        />
      </ReactFlow>
    </div>
  );
}
