import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // We will add IPC methods here later for file system and hardware access
});
