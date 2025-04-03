const videoPreview = document.getElementById("videoPreview");
const uploadBtn = document.getElementById("uploadBtn");
const videoInput = document.getElementById("videoInput");
const sortableList = document.getElementById("sortableList");
const mergeBtn = document.getElementById("mergeBtn");

let videoFiles = [];

uploadBtn.addEventListener("click", () => videoInput.click());
document.getElementById("addNewVideo").addEventListener("click", function () {
    document.getElementById("videoInput").click(); // Opens file selector
});

// ✅ Handle File Selection
videoInput.addEventListener("change", async (event) => {
    const files = Array.from(event.target.files);

    for (const file of files) {
        const fileBuffer = await readFileAsBuffer(file);

        if (!fileBuffer) {
            alert("Error reading file!");
            continue;
        }

        const url = URL.createObjectURL(file);
        generateThumbnail(url, file.name, fileBuffer);
    }

    videoInput.value = ""; // Reset input for re-upload
});

// ✅ Read File as Buffer
function readFileAsBuffer(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
    });
}

// ✅ Generate Thumbnail
function generateThumbnail(videoUrl, fileName, fileBuffer) {
    const video = document.createElement("video");
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;

    video.addEventListener("loadedmetadata", () => {
        video.currentTime = 2;
    });

    video.addEventListener("seeked", () => {
        const canvas = document.createElement("canvas");
        canvas.width = 160;
        canvas.height = 90;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const thumbnailUrl = canvas.toDataURL("image/png");
        addToTimeline(videoUrl, fileName, thumbnailUrl, formatDuration(video.duration), fileBuffer);
    });
}

// ✅ Add to Timeline
function addToTimeline(videoUrl, fileName, thumbnailUrl, duration, fileBuffer) {
    const videoId = videoFiles.length;

    const videoBlock = document.createElement("div");
    videoBlock.classList.add("video-block");
    videoBlock.dataset.id = videoId;

    videoBlock.innerHTML = `
        <img src="${thumbnailUrl}" class="video-thumbnail">
        <span>${fileName}</span>
        <span class="video-duration">${duration}</span>
        <button class="remove-btn">X</button>
    `;

    videoBlock.querySelector(".remove-btn").addEventListener("click", (event) => {
        event.stopPropagation();
        removeVideo(videoId, videoBlock);
    });

    videoBlock.addEventListener("click", () => {
        videoPreview.src = videoUrl;
        videoPreview.play();
    });

    sortableList.appendChild(videoBlock);

    videoFiles.push({ id: videoId, name: fileName, duration, buffer: fileBuffer });

    // ✅ Initialize Sortable
    new Sortable(sortableList, {
        animation: 150,
        onEnd: () => {
            const reorderedFiles = [];
            Array.from(sortableList.children).forEach((block) => {
                const id = parseInt(block.dataset.id);
                const video = videoFiles.find(v => v.id === id);
                if (video) reorderedFiles.push(video);
            });
            videoFiles = reorderedFiles;
        }
    });
}

// ✅ Remove Video
function removeVideo(videoId, videoBlock) {
    const index = videoFiles.findIndex(v => v.id == videoId);
    if (index !== -1) {
        videoFiles.splice(index, 1);
    }

    videoBlock.remove();

    if (videoFiles.length === 0) {
        videoPreview.src = "";
    }
}


// ✅ Format Duration
function formatDuration(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
}

// ✅ Merge Videos
mergeBtn.addEventListener("click", async () => {
    if (videoFiles.length === 0) return alert("No videos selected!");

    try {
        const result = await window.electron.mergeVideos(videoFiles);
        if (result.success) {
            alert(`Merge completed! Video saved.`);
            videoPreview.src = result.outputFilePath;
            videoPreview.play();
        } else {
            alert("Merge failed: " + result.message);
        }
    } catch (error) {
        alert("Error: " + error.message);
    }
});
