import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import ClientPortalNegotiation from './ClientPortalNegotiation';
import { Process } from '../types';

interface BlindBiddingModalProps {
  isOpen: boolean;
  onClose: () => void;
  processoId: string;
  userType: 'REQUERENTE' | 'REQUERIDO';
  onSuccess?: () => void;
}

export function BlindBiddingModal({ isOpen, onClose, processoId, userType, onSuccess }: BlindBiddingModalProps) {
  const [processo, setProcesso] = React.useState<Process | null>(null);

  React.useEffect(() => {
    if (!processoId || !isOpen) return;
    const unsubscribe = onSnapshot(doc(db, 'processos', processoId), (doc) => {
      if (doc.exists()) setProcesso({ id: doc.id, ...doc.data() } as Process);
    });
    return () => unsubscribe();
  }, [processoId, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-transparent overflow-hidden"
          >
            <button 
              onClick={onClose}
              className="absolute top-0 right-0 p-4 z-[110] text-white/50 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            {processo && (
              <ClientPortalNegotiation 
                processo={processo}
                role={userType === 'REQUERENTE' ? 'requerente' : 'requerido'}
                onUpdate={() => {
                  if (onSuccess) onSuccess();
                }}
              />
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
