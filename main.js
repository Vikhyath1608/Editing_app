const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        }
    });

    win.loadFile("index.html");
}

// Utility to run FFmpeg and return a promise
function runFFmpeg(args, onProgress) {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn("ffmpeg", args);

        ffmpeg.stderr.on("data", (data) => {
            const message = data.toString();
            const match = message.match(/frame=\s*\d+/);
            if (match && onProgress) {
                onProgress(message);
            }
        });

        ffmpeg.on("error", (error) => reject(error));
        ffmpeg.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error("FFmpeg exited with code " + code));
        });
    });
}

ipcMain.handle("merge-videos", async (event, videoData) => {
    try {
        console.log("Saving temporary video files...");

        const tempFiles = videoData.map((video, index) => {
            const tempPath = path.join(os.tmpdir(), `temp_video_${index}.mp4`);
            fs.writeFileSync(tempPath, Buffer.from(video.buffer));
            console.log(" Saved temp file:", tempPath);
            return tempPath;
        });

        console.log(" Normalizing all temp videos...");

        const normalizedFiles = [];

        for (let i = 0; i < tempFiles.length; i++) {
            const input = tempFiles[i];
            const output = path.join(os.tmpdir(), `normalized_video_${i}.mp4`);
            console.log(" Normalizing file " + i + ":", input);
            console.log("Normalizing", input, "->", output);

            await runFFmpeg([
                "-i", input,
                "-vf", "scale=1280:720",
                "-r", "30",
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-y",
                output
            ]);

            console.log("Normalized video saved:", output);
            normalizedFiles.push(output);
        }

        console.log(" Starting merge process...");

        const { dialog } = require("electron");

        const saveDialog = await dialog.showSaveDialog({
            title: "Save Merged Video",
            defaultPath: path.join(app.getPath("desktop"), `merged_video_${Date.now()}.mp4`),
            filters: [{ name: "MP4 Video", extensions: ["mp4"] }],
        });

        if (saveDialog.canceled || !saveDialog.filePath) {
            return { success: false, message: "Save cancelled" };
        }

        const mergeOutput = saveDialog.filePath;


        const ffmpegArgs = [];

        normalizedFiles.forEach(file => {
            ffmpegArgs.push("-i", file);
            console.log("Adding input:", file);
        });

        ffmpegArgs.push(
            "-y",
            "-filter_complex",
            `concat=n=${normalizedFiles.length}:v=1:a=0`,
            mergeOutput
        );

        console.log("🔧 FFmpeg started:", "ffmpeg", ffmpegArgs.join(" "));

        await runFFmpeg(ffmpegArgs, (progress) => {
            const match = progress.match(/frame=\s*(\d+)/);
            if (match) {
                const percent = Math.min(100, Math.floor((parseInt(match[1], 10) / 100) * 10));
                event.sender.send("merge-progress", percent);
                console.log("Merge Progress:", percent + "%");
            }
        });

        console.log(" Merge completed successfully!");

        console.log("Cleaning up temporary files...");
        [...tempFiles, ...normalizedFiles].forEach(file => {
            try {
                fs.unlinkSync(file);
                console.log("Deleted:", file);
            } catch (err) {
                console.warn(" Could not delete temp file:", file, err);
            }
        });

        return { success: true, outputFilePath: mergeOutput };


    } catch (error) {
        console.error(" Error occurred in handler for 'merge-videos':", error);
        return {
            success: false,
            message: error.message
        };
    }
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
