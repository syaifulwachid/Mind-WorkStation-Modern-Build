import { Heart } from 'lucide-react';

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DonateModal = ({ isOpen, onClose }: DonateModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[400px] bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
        {/* Title Bar */}
        <div className="h-8 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-white/10 flex items-center px-3 justify-between">
          <div className="flex items-center text-white text-xs font-bold tracking-wide">
            <Heart size={14} className="text-rose-500 mr-2" />
            Support SWD SOFT DEVELOPER
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-400 font-bold text-lg transition-colors leading-none pb-1">×</button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col items-center space-y-4">
          <div className="text-center">
            <h2 className="text-lg font-bold text-slate-200 mb-2">Donate via QRIS</h2>
            <p className="text-xs text-slate-400">Scan the QR code below using your favorite payment app to support the development.</p>
          </div>
          
          <div className="bg-white p-4 rounded-xl shadow-inner flex items-center justify-center w-64 h-64 border-4 border-slate-700/50">
            <img src="/qris.png" alt="QRIS Donation" className="max-w-full max-h-full object-contain" />
          </div>
          
          <p className="text-[10px] text-slate-500 font-mono">NMID : ID1025459665549A01</p>

          <div className="w-full flex justify-end mt-2 border-t border-white/10 pt-4">
            <button 
              onClick={onClose}
              className="bg-cyan-500/20 border border-cyan-500/50 text-[11px] px-6 py-1.5 rounded-md text-cyan-400 hover:bg-cyan-500/30 hover:shadow-[0_0_10px_rgba(6,182,212,0.3)] transition-all font-bold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
