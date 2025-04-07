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

    // 🔹 Insert before `#addNewVideo`
    const addNewBlock = document.getElementById("addNewVideo");
    sortableList.insertBefore(videoBlock, addNewBlock);

    // 🔹 Move `#addNewVideo` to the end
    sortableList.appendChild(addNewBlock);

    videoFiles.push({ id: videoId, name: fileName, duration, buffer: fileBuffer });

    // ✅ Update SortableJS to maintain correct order
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
const mergeProgress = document.getElementById("mergeProgress");
const progressText = document.getElementById("progressText");
const progressContainer = document.getElementById("progressContainer");

mergeBtn.addEventListener("click", async () => {
    if (videoFiles.length === 0) return alert("No videos selected!");

    progressContainer.classList.remove("hidden");
    mergeProgress.value = 0;
    progressText.innerText = "Merging...";

    try {
        const result = await window.electron.mergeVideos(videoFiles);

        if (result.success) {
            progressText.innerText = "Merge Completed!";
            mergeProgress.value = 100;
            videoPreview.src = `file://${result.outputFilePath}`;
            videoPreview.play();
        } else {
            progressText.innerText = `Failed: ${result.message}`;
        }
    } catch (error) {
        progressText.innerText = "Unexpected Error!";
    }

    setTimeout(() => {
        progressContainer.classList.add("hidden");
    }, 3000);
});


// Listen for progress updates from main.js
window.electron.onMergeProgress((progress) => {
    mergeProgress.value = progress;
    progressText.innerText = `Merging... ${progress}%`;
});
