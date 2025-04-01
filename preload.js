const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
    mergeVideos: (videoData) => ipcRenderer.invoke("merge-videos", videoData)
});
