

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");

let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });

    mainWindow.loadFile("index.html");
});

ipcMain.handle("merge-videos", async (event, videoPaths) => {
    return new Promise((resolve, reject) => {
        const outputFilePath = path.join(app.getPath("desktop"), "merged_output.mp4");

        const ffmpegCommand = ffmpeg();

        videoPaths.forEach((video) => {
            ffmpegCommand.input(video);
        });

        ffmpegCommand
            .on("end", () => resolve(outputFilePath))
            .on("error", (err) => reject(err))
            .mergeToFile(outputFilePath, path.join(app.getPath("temp")));
    });
});
