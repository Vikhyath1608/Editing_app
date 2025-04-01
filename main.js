const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const os = require("os");

let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile("index.html");
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// ✅ Handle Video Merging
ipcMain.handle("merge-videos", async (event, videoData) => {
    if (videoData.length === 0) return { success: false, message: "No videos provided!" };

    const saveDialog = await dialog.showSaveDialog(mainWindow, {
        title: "Save Merged Video",
        defaultPath: path.join(app.getPath("desktop"), "merged_video.mp4"),
        filters: [{ name: "MP4 Video", extensions: ["mp4"] }]
    });

    if (saveDialog.canceled) return { success: false, message: "No location selected." };

    const outputFilePath = saveDialog.filePath;

    // ✅ Save buffers as temporary files
    const tempFiles = videoData.map((video, index) => {
        const tempFilePath = path.join(os.tmpdir(), `temp_video_${index}.mp4`);
        fs.writeFileSync(tempFilePath, Buffer.from(video.buffer));
        return tempFilePath;
    });

    return new Promise((resolve, reject) => {
        const command = ffmpeg();

        tempFiles.forEach(filePath => {
            command.input(filePath);
        });

        command
            .on("start", () => console.log("Merging videos..."))
            .on("end", () => {
                console.log("Merge Completed!");

                // ✅ Delete temporary files
                tempFiles.forEach(file => fs.unlinkSync(file));

                resolve({ success: true, outputFilePath });
            })
            .on("error", (err) => {
                console.error("Merge Error:", err);
                reject({ success: false, message: err.message });
            })
            .mergeToFile(outputFilePath, path.dirname(outputFilePath));
    });
});
