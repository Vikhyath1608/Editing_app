const { app, BrowserWindow, ipcMain } = require("electron");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");

let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile("index.html");
});

// ✅ Merge Videos Using FFmpeg
ipcMain.handle("merge-videos", async (event, videoPaths) => {
    if (videoPaths.length === 0) return { success: false, message: "No videos provided!" };

    const outputFilePath = path.join(app.getPath("desktop"), "merged_video.mp4");

    return new Promise((resolve, reject) => {
        const command = ffmpeg();

        videoPaths.forEach(filePath => {
            console.log("Adding video to merge:", filePath);
            command.input(filePath);
        });

        command
            .on("start", () => {
                console.log("Merging videos...");
            })
            .on("end", () => {
                console.log("Merge Completed!");
                resolve({ success: true, outputFilePath });
            })
            .on("error", (err) => {
                console.error("Merge Error:", err);
                reject({ success: false, message: err.message });
            })
            .mergeToFile(outputFilePath, path.dirname(outputFilePath));
    });
});
