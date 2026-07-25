import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoreHorizontal, Clock, MessageSquare, Paperclip } from 'lucide-react';
import { Badge } from '../../components/common/Badge';
import { Avatar, AvatarGroup } from '../../components/common/Avatar';
import { useWorkspaceNavigate as useNavigate } from '../../hooks/useWorkspaceNavigate';
import axios from '../../api/axios';
import toast from 'react-hot-toast';

const columns = [
  {
    id: 'todo',
    title: 'To Do',
    color: 'gray',
    bgColor: 'bg-gray-200 dark:bg-gray-400',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    color: 'blue',
    bgColor: 'bg-blue-200 dark:bg-blue-400',
  },
  {
    id: 'review',
    title: 'Review',
    color: 'yellow',
    bgColor: 'bg-yellow-200 dark:bg-yellow-400',
  },
  {
    id: 'completed',
    title: 'Completed',
    color: 'green',
    bgColor: 'bg-green-200 dark:bg-green-400',
  },
];

const priorityColors = {
  low: 'gray',
  medium: 'blue',
  high: 'yellow',
  urgent: 'red',
};
const priorityLabels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const DroppableColumn = ({ column, children, isOver }) => {
  const { setNodeRef } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      id={column.id}
      className={`${column.bgColor} rounded-lg p-3 min-h-[300px] transition-all ${
        isOver ? 'ring-2 ring-primary-500 scale-[1.02]' : ''
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 sticky top-0 z-10 py-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200">
            {column.title}
          </h3>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2 min-h-[200px]">
        {children}
        {(!children || (Array.isArray(children) && children.length === 0)) && (
          <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Drop tasks here
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const SortableTaskCard = ({ task }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} isDragging={isDragging} />
    </div>
  );
};

const TaskCard = ({ task, isDragging }) => {
  const navigate = useNavigate();
  if (!task) return null;

  const completedCount = task.checklist?.filter((c) => c.completed).length || 0;
  const totalCount = task.checklist?.length || 0;
  const checklistProgress =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'completed';

  return (
    <motion.div
      layout
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 cursor-grab active:cursor-grabbing transition-shadow ${
        isDragging
          ? 'shadow-xl ring-2 ring-primary-500 rotate-2 scale-105'
          : 'shadow-sm hover:shadow-md'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/tasks/${task._id}`);
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <Badge variant={priorityColors[task.priority] || 'gray'} size="sm">
          {priorityLabels[task.priority] || task.priority || 'Medium'}
        </Badge>
        <button
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <h4
        className={`font-medium text-sm mb-2 line-clamp-2 ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}
      >
        {task.title || 'Untitled Task'}
      </h4>

      {task.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.map((label, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: (label.color || '#3b82f6') + '20',
                color: label.color || '#3b82f6',
              }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {totalCount > 0 && (
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Checklist</span>
            <span>
              {completedCount}/{totalCount}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${checklistProgress === 100 ? 'bg-green-500' : 'bg-primary-500'}`}
              style={{ width: `${checklistProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {task.comments?.length > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {task.comments.length}
            </span>
          )}
          {task.attachments?.length > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              {task.attachments.length}
            </span>
          )}
          {task.dueDate && (
            <span
              className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : ''}`}
            >
              <Clock className="w-3 h-3" />
              {new Date(task.dueDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>
        {task.assignedTo?.length > 0 && (
          <AvatarGroup max={3}>
            {task.assignedTo.map((a, i) => (
              <Avatar
                key={a.user?._id || a._id || i}
                name={
                  a.user?.firstName
                    ? `${a.user.firstName} ${a.user.lastName}`
                    : 'User'
                }
                size="sm"
              />
            ))}
          </AvatarGroup>
        )}
      </div>
    </motion.div>
  );
};

const KanbanBoard = ({ tasks = [], onUpdate, onTaskMove }) => {
  const [activeTask, setActiveTask] = useState(null);
  const [overColumnId, setOverColumnId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event) => {
    const task = (tasks || []).find((t) => t._id === event.active.id);
    setActiveTask(task);
  };

  const handleDragOver = (event) => {
    const { over } = event;

    const column = columns.find((c) => c.id === over?.id);
    if (column) {
      setOverColumnId(column.id);
    } else {
      setOverColumnId(null);
    }
  };

  const handleDragEnd = useCallback(
    async (event) => {
      const { active, over } = event;
      setActiveTask(null);
      setOverColumnId(null);

      if (!over) return;

      const draggedTask = (tasks || []).find((t) => t._id === active.id);
      if (!draggedTask) return;

      let targetColumnId = null;
      const droppedOnColumn = columns.find((c) => c.id === over.id);
      if (droppedOnColumn) {
        targetColumnId = droppedOnColumn.id;
      } else {
        const overTask = tasks.find((t) => t._id === over.id);
        if (overTask) targetColumnId = overTask.boardColumn;
      }

      if (targetColumnId && draggedTask.boardColumn !== targetColumnId) {
        onTaskMove?.(draggedTask._id, {
          boardColumn: targetColumnId,
          status: targetColumnId === 'completed' ? 'completed' : targetColumnId,
        });
        toast.success(
          `Task moved to ${columns.find((c) => c.id === targetColumnId)?.title}`
        );

        try {
          await axios.put(`/tasks/${draggedTask._id}/board`, {
            boardColumn: targetColumnId,
          });
        } catch {
          toast.error('Failed to move task');
          onUpdate?.(); // Revert on error
        }
      }
    },
    [tasks, onUpdate, onTaskMove]
  );

  const safeTasks = Array.isArray(tasks) ? tasks : [];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column) => {
          const columnTasks = safeTasks.filter(
            (t) => t?.boardColumn === column.id
          );

          return (
            <DroppableColumn
              key={column.id}
              column={column}
              isOver={overColumnId === column.id}
            >
              <SortableContext
                items={columnTasks.map((t) => t._id)}
                strategy={verticalListSortingStrategy}
              >
                {columnTasks.map((task) => (
                  <SortableTaskCard key={task._id} task={task} />
                ))}
              </SortableContext>
            </DroppableColumn>
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <div className="w-72 opacity-90 rotate-2">
            <TaskCard task={activeTask} isDragging />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
