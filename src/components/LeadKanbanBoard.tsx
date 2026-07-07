import React, { useState } from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Phone, Mail, FileText, MoreVertical, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Lead {
  id: string;
  cliente_nome: string;
  cliente_email: string;
  cliente_whatsapp: string;
  cliente_documento: string;
  status: string;
  data_abertura: string;
}

interface KanbanColumnProps {
  id: string;
  title: string;
  leads: Lead[];
}

const STAGES = [
  { id: 'LEAD', title: 'Fase Gratuita' },
  { id: 'SIMULACAO_PAGA', title: 'Simulação (R$17)' },
  { id: 'LAUDO_PAGO', title: 'Laudo (R$47)' },
  { id: 'MEDIACAO_CONTRATADA', title: 'Mediação (R$297)' },
];

function SortableLeadCard({ lead }: { lead: Lead }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-white p-4 rounded-xl border border-gray-100 shadow-sm mb-3 cursor-grab active:cursor-grabbing hover:border-blue-200 hover:shadow-md transition-all group relative",
        isDragging && "z-50 shadow-2xl ring-2 ring-blue-500"
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-[#1e293b] text-sm leading-tight group-hover:text-blue-600 truncate mr-6">
          {lead.cliente_nome}
        </h4>
        <button className="text-gray-300 hover:text-gray-500">
          <MoreVertical size={14} />
        </button>
      </div>
      
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium">
          <Phone size={12} className="text-gray-300" />
          {lead.cliente_whatsapp}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium italic">
          <Mail size={12} className="text-gray-300" />
          <span className="truncate">{lead.cliente_email}</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
         <div className="flex items-center gap-1 text-[9px] font-bold text-gray-300 uppercase tracking-tighter">
            <Calendar size={10} />
            {new Date(lead.data_abertura).toLocaleDateString()}
         </div>
         <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
            <FileText size={12} className="text-gray-400 group-hover:text-blue-500" />
         </div>
      </div>
    </div>
  );
}

function KanbanColumn({ id, title, leads }: KanbanColumnProps) {
  const { setNodeRef } = useSortable({ id });

  return (
    <div className="flex flex-col h-full min-w-[280px] bg-gray-100/40 rounded-2xl p-3 border border-gray-200/50">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
           <h3 className="text-xs font-black text-[#1e293b] uppercase tracking-widest">{title}</h3>
           <span className="bg-white border border-gray-200 text-[10px] font-bold px-1.5 py-0.5 rounded-md text-gray-500">
             {leads.length}
           </span>
        </div>
      </div>

      <div ref={setNodeRef} className="flex-1 overflow-y-auto scrollbar-hide min-h-[150px]">
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <SortableLeadCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export function LeadKanbanBoard({ initialLeads }: { initialLeads: Lead[] }) {
  const [items, setItems] = useState(initialLeads);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  React.useEffect(() => {
    setItems(initialLeads);
  }, [initialLeads]);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeLead = items.find((l) => l.id === activeId);
    if (!activeLead) return;

    // Check if we are dragging over a column or another card
    const isOverColumn = STAGES.some(s => s.id === overId);
    const newStatus = isOverColumn ? overId : items.find(l => l.id === overId)?.status;

    if (newStatus && activeLead.status !== newStatus) {
      setItems((prev) => {
        const updated = prev.map((l) =>
          l.id === activeId ? { ...l, status: newStatus } : l
        );
        return updated;
      });
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    
    if (over) {
      const activeLead = items.find(l => l.id === active.id);
      if (activeLead) {
        const docRef = doc(db, 'processos', activeLead.id.toString());
        await updateDoc(docRef, { status: activeLead.status });
      }
    }
    
    setActiveId(null);
  };

  return (
    <div className="w-full h-full overflow-x-auto pb-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 h-full min-h-[600px] items-start">
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage.id}
              id={stage.id}
              title={stage.title}
              leads={items.filter((l) => l.status === stage.id)}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.5',
              },
            },
          }),
        }}>
          {activeId ? (
            <SortableLeadCard lead={items.find(l => l.id === activeId)!} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
