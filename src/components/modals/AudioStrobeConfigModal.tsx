export const AudioStrobeConfigModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] font-sans">
      <div className="bg-slate-900 border border-white/20 shadow-2xl shadow-cyan-500/10 w-[550px] overflow-hidden flex flex-col relative rounded">
        
        {/* Background Graphic overlay (simulation) */}
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-500 via-transparent to-transparent"></div>

        {/* Header */}
        <div className="bg-slate-800 px-3 py-2 border-b border-white/10 flex justify-between items-center select-none relative z-10">
          <span className="text-[12px] text-slate-200 font-bold tracking-wide">AudioStrobe Configuration Tool</span>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-400 font-bold px-1 text-sm leading-none transition-colors">&times;</button>
        </div>

        <div className="p-8 relative z-10 flex flex-col items-center">
          <h2 className="text-xl text-cyan-400 font-semibold mb-8 tracking-wide">AudioStrobe Configuration Tool</h2>
          
          <div className="flex w-full mb-8">
            <div className="w-1/3 flex items-center justify-center">
              {/* Glasses Icon Placeholder */}
              <div className="w-24 h-24 bg-slate-800 border border-white/10 rounded-xl flex items-center justify-center shadow-inner relative">
                <div className="absolute top-2 right-2 w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,1)] animate-pulse"></div>
                <span className="text-5xl drop-shadow-lg">👓</span>
              </div>
            </div>
            <div className="w-2/3 pl-6 space-y-4 text-[12px] text-slate-300 leading-relaxed">
              <p>
                AudioStrobe uses inaudible sound to control LED lights.
              </p>
              <p>
                When using AudioStrobe, the brightness of the LEDs are controlled by the volume of the AudioStrobe signal. So, the volume levels of your computer can have a negative effect on AudioStrobe performance. The brightness will also differ depending on the mind machine or decoder you are using.
              </p>
              <p className="text-cyan-400/80 italic">
                This configuration tool is meant to help you adjust these levels to get the best use out of your AudioStrobe device.
              </p>
            </div>
          </div>

          <button className="px-8 py-2.5 bg-slate-800 border border-cyan-500/50 text-cyan-400 rounded text-[13px] font-medium shadow-[0_0_15px_rgba(34,211,238,0.15)] hover:bg-slate-700 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:text-cyan-300 transition-all mt-4 mb-2">
            Begin AudioStrobe Testing
          </button>
        </div>

        {/* Footer */}
        <div className="bg-slate-800 p-3 flex justify-end space-x-3 border-t border-white/10 relative z-10">
          <button onClick={onClose} className="px-6 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-white/10 rounded text-[12px] font-medium transition-colors">
            Cancel
          </button>
          <button className="px-6 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-white/10 rounded text-[12px] font-medium transition-colors">
            Help
          </button>
        </div>
      </div>
    </div>
  );
};
