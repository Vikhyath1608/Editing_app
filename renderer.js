const videoPreview = document.getElementById("videoPreview");
const uploadBtn = document.getElementById("uploadBtn");
const videoInput = document.getElementById("videoInput");
const sortableList = document.getElementById("sortableList");
const mergeBtn = document.getElementById("mergeBtn");

let videoFiles = [];

// ✅ Confirm Upload Button Click
uploadBtn.addEventListener("click", () => {
    console.log("Upload button clicked");
    videoInput.click();
});

// ✅ Handle File Selection
videoInput.addEventListener("change", (event) => {
    const files = Array.from(event.target.files);
    console.log("Selected files:", files);

    if (files.length === 0) return;

    files.forEach((file) => {
        if (videoFiles.some(video => video.name === file.name)) {
            alert("This video is already added!");
            return;
        }

        const url = URL.createObjectURL(file);
        generateThumbnail(url, file.name, file);
    });

    videoInput.value = ""; // Reset input for re-upload
});

// ✅ Generate Thumbnail & Add to Timeline
function generateThumbnail(videoUrl, fileName, file) {
    const video = document.createElement("video");
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;

    video.addEventListener("loadedmetadata", () => {
        video.currentTime = 2;
    });

    video.addEventListener("seeked", () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = 160;
        canvas.height = 90;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const thumbnailUrl = canvas.toDataURL("image/png");
        addToTimeline(videoUrl, fileName, thumbnailUrl, formatDuration(video.duration), file);
    });
}

// ✅ Add Video to Timeline
function addToTimeline(videoUrl, fileName, thumbnailUrl, duration, file) {
    const videoId = videoFiles.length;

    const videoBlock = document.createElement("div");
    videoBlock.classList.add("video-block");
    videoBlock.dataset.id = videoId;

    const thumbnail = document.createElement("img");
    thumbnail.src = thumbnailUrl;
    thumbnail.classList.add("video-thumbnail");

    const videoLabel = document.createElement("span");
    videoLabel.textContent = fileName;

    const durationLabel = document.createElement("span");
    durationLabel.classList.add("video-duration");
    durationLabel.textContent = duration;

    const removeBtn = document.createElement("button");
    removeBtn.classList.add("remove-btn");
    removeBtn.textContent = "X";

    removeBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        removeVideo(videoId, videoBlock);
    });

    videoBlock.addEventListener("click", () => {
        videoPreview.src = videoUrl;
        videoPreview.play();
    });

    videoBlock.appendChild(thumbnail);
    videoBlock.appendChild(videoLabel);
    videoBlock.appendChild(durationLabel);
    videoBlock.appendChild(removeBtn);
    sortableList.appendChild(videoBlock);

    videoFiles.push({ id: videoId, url: videoUrl, name: fileName, duration, filePath: file.path });

    console.log("Added to timeline:", fileName);
}

// ✅ Drag & Drop Sorting
new Sortable(sortableList, {
    animation: 150,
    onEnd: () => {
        videoFiles = Array.from(sortableList.children).map((block) => {
            return videoFiles.find(v => v.id == block.dataset.id);
        });
    }
});

// ✅ Remove Video
function removeVideo(videoId, videoBlock) {
    const removedVideo = videoFiles.find(v => v.id === videoId);
    videoFiles = videoFiles.filter(v => v.id !== videoId);
    videoBlock.remove();

    if (videoPreview.src.includes(removedVideo.url)) {
        videoPreview.pause();
        videoPreview.src = "";
    }
}

// ✅ Format Duration
function formatDuration(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
}
const { ipcRenderer } = require("electron");
const statusText = document.createElement("p");
document.body.appendChild(statusText);

mergeBtn.addEventListener("click", async () => {
    if (videoFiles.length === 0) return alert("No videos selected!");

    // 🛠️ Use file paths instead of URLs
    const videoPaths = videoFiles.map(video => video.filePath);

    statusText.textContent = "Waiting for merge...";
    
    try {
        const result = await ipcRenderer.invoke("merge-videos", videoPaths);
        if (result.success) {
            statusText.textContent = "Merge completed! Saved to: " + result.outputFilePath;
            videoPreview.src = result.outputFilePath; // ✅ Auto-play merged video
            videoPreview.play();
        } else {
            statusText.textContent = "Merge failed: " + result.message;
        }
    } catch (error) {
        statusText.textContent = "Error: " + error.message;
    }
});

// Listen for progress updates
ipcRenderer.on("merge-status", (event, data) => {
    statusText.textContent = data.status;
});
