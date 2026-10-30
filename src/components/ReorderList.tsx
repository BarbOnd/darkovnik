import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, type ReactNode } from "react";
import { ArrowDownIcon, ArrowUpIcon, GripIcon } from "./icons";
import { StatusMessage } from "./StatusMessage";

type ReorderListProps<T> = {
  /** Items in their current order. The list keeps its own order while it is shown. */
  items: T[];
  getId(item: T): number;
  /** Plain-text name used in accessible labels and announcements. */
  getLabel(item: T): string;
  renderItem(item: T): ReactNode;
  /** Persists the new order (IDs of all shown items). Rejecting restores the previous order. */
  onReorder(ids: number[]): Promise<void>;
};

type RowProps = {
  id: number;
  label: string;
  index: number;
  count: number;
  children: ReactNode;
  onMove(offset: number): void;
};

function SortableRow({ id, label, index, count, children, onMove }: RowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <li
      ref={setNodeRef}
      className={isDragging ? "reorder-row reorder-row--dragging" : "reorder-row"}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <div className="reorder-row__content">{children}</div>
      <button
        type="button"
        className="icon-button"
        aria-label={`Posunout ${label} nahoru`}
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        <ArrowUpIcon />
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label={`Posunout ${label} dolů`}
        disabled={index === count - 1}
        onClick={() => onMove(1)}
      >
        <ArrowDownIcon />
      </button>
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="icon-button reorder-row__handle"
        {...attributes}
        {...listeners}
        aria-label={`Přetáhnout ${label}`}
      >
        <GripIcon />
      </button>
    </li>
  );
}

/** Reorder mode: drag rows by the ⋮⋮ handle, or use the up/down buttons. */
export function ReorderList<T>({ items, getId, getLabel, renderItem, onReorder }: ReorderListProps<T>) {
  const [order, setOrder] = useState(() => items);
  const [failed, setFailed] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const labelOf = (id: UniqueIdentifier) => {
    const item = order.find((candidate) => getId(candidate) === id);
    return item === undefined ? "" : getLabel(item);
  };
  const positionOf = (id: UniqueIdentifier) => order.findIndex((candidate) => getId(candidate) === id) + 1;

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Zvednuto: ${labelOf(active.id)}, pozice ${positionOf(active.id)} z ${order.length}.`,
    onDragOver: ({ active, over }) =>
      over ? `${labelOf(active.id)} je nyní na pozici ${positionOf(over.id)} z ${order.length}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over ? `${labelOf(active.id)} položeno na pozici ${positionOf(over.id)} z ${order.length}.` : undefined,
    onDragCancel: ({ active }) => `Přesun zrušen. ${labelOf(active.id)} zůstává na původním místě.`,
  };

  async function commit(next: T[]) {
    const previous = order;
    setOrder(next);
    setFailed(false);
    try {
      await onReorder(next.map(getId));
    } catch {
      setOrder(previous);
      setFailed(true);
    }
  }

  function move(index: number, offset: number) {
    const target = index + offset;
    if (target < 0 || target >= order.length) return;
    void commit(arrayMove(order, index, target));
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (over === null || active.id === over.id) return;
    const from = order.findIndex((item) => getId(item) === active.id);
    const to = order.findIndex((item) => getId(item) === over.id);
    if (from === -1 || to === -1) return;
    void commit(arrayMove(order, from, to));
  }

  return (
    <>
      {failed && <StatusMessage kind="error" message="Pořadí se nepodařilo uložit. Zkuste to prosím znovu." />}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={handleDragEnd}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "Položku zvednete mezerníkem nebo Enterem, šipkami ji posunete a dalším stiskem mezerníku nebo Enteru ji položíte. Escape přesun zruší.",
          },
        }}
      >
        <SortableContext items={order.map(getId)} strategy={verticalListSortingStrategy}>
          <ul className="reorder-list">
            {order.map((item, index) => (
              <SortableRow
                key={getId(item)}
                id={getId(item)}
                label={getLabel(item)}
                index={index}
                count={order.length}
                onMove={(offset) => move(index, offset)}
              >
                {renderItem(item)}
              </SortableRow>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </>
  );
}
