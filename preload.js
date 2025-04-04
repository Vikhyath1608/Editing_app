const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
    mergeVideos: (videoData) => ipcRenderer.invoke("merge-videos", videoData),
    onMergeProgress: (callback) => ipcRenderer.on("merge-progress", (event, progress) => callback(progress))
});
