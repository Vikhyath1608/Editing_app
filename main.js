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

ipcMain.handle("merge-videos", async (event, videoData) => {
    if (videoData.length === 0) return { success: false, message: "No videos provided!" };

    const saveDialog = await dialog.showSaveDialog(mainWindow, {
        title: "Save Merged Video",
        defaultPath: path.join(app.getPath("desktop"), "merged_video.mp4"),
        filters: [{ name: "MP4 Video", extensions: ["mp4"] }]
    });

    if (saveDialog.canceled) return { success: false, message: "No location selected." };

    const outputFilePath = saveDialog.filePath;
    let tempFiles = [];

    try {
        tempFiles = videoData.map((video, index) => {
            const tempFilePath = path.join(os.tmpdir(), `temp_video_${index}.mp4`);
            fs.writeFileSync(tempFilePath, Buffer.from(video.buffer));
            return tempFilePath;
        });

        return new Promise((resolve, reject) => {
            const command = ffmpeg();

            tempFiles.forEach((filePath) => command.input(filePath));

            let progress = 0;
            command
                .on("start", () => {
                    progress = 10;
                    mainWindow.webContents.send("merge-progress", progress);
                })
                .on("progress", (data) => {
                    if (data.percent) {
                        progress = Math.min(90, Math.round(data.percent));
                        mainWindow.webContents.send("merge-progress", progress);
                    }
                })
                .on("end", () => {
                    mainWindow.webContents.send("merge-progress", 100);
                    resolve({ success: true, outputFilePath });
                })
                .on("error", (err) => {
                    mainWindow.webContents.send("merge-progress", 0);
                    reject({ success: false, message: err.message });
                })
                .mergeToFile(outputFilePath, path.dirname(outputFilePath));
        });
    } catch (error) {
        return { success: false, message: "Failed to process videos." };
    }
});

// ✅ Function to normalize video (resize, re-encode)
function normalizeVideo(inputFile, index) {
    return new Promise((resolve, reject) => {
        const outputFilePath = path.join(os.tmpdir(), `normalized_video_${index}.mp4`);
        
        ffmpeg(inputFile)
            .outputOptions([
                "-vf scale=1280:720", // ✅ Resize to 720p
                "-r 30", // ✅ Standardize frame rate to 30 FPS
                "-c:v libx264", // ✅ Set consistent video codec
                "-preset fast",
                "-c:a aac", // ✅ Ensure audio consistency
                "-b:a 128k"
            ])
            .on("end", () => {
                console.log(`Normalized video saved: ${outputFilePath}`);
                resolve(outputFilePath);
            })
            .on("error", (err) => {
                console.error("Normalization Error:", err);
                reject(err);
            })
            .save(outputFilePath);
    });
}

// ✅ Function to clean up temp files
function cleanupTempFiles(files) {
    files.forEach(file => {
        try {
            if (fs.existsSync(file)) fs.unlinkSync(file);
        } catch (err) {
            console.warn(`Failed to delete temp file: ${file}`, err);
        }
    });
}
