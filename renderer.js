
const videoPreview = document.getElementById("videoPreview");
const uploadBtn = document.getElementById("uploadBtn");
const videoInput = document.getElementById("videoInput");
const sortableList = document.getElementById("sortableList");
const mergeBtn = document.getElementById("mergeBtn");

let videoFiles = [];

uploadBtn.addEventListener("click", () => videoInput.click());

videoInput.addEventListener("change", (event) => {
    const files = Array.from(event.target.files);

    if (files.length === 0) return;

    files.forEach((file) => {
        // Prevent duplicate uploads
        if (videoFiles.some(video => video.name === file.name)) {
            alert("This video is already added!");
            return;
        }

        const url = URL.createObjectURL(file);
        generateThumbnail(url, file.name, file);
    });

    // Reset file input to allow re-uploading the same file
    videoInput.value = "";
});

function generateThumbnail(videoUrl, fileName, file) {
    const video = document.createElement("video");
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;

    video.addEventListener("loadedmetadata", () => {
        video.currentTime = 2; // Capture frame at 2 seconds
    });

    video.addEventListener("seeked", () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = 160; // Set thumbnail size
        canvas.height = 90;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const thumbnailUrl = canvas.toDataURL("image/png");
        addToTimeline(videoUrl, fileName, thumbnailUrl, formatDuration(video.duration));
    });
}

function addToTimeline(videoUrl, fileName, thumbnailUrl, duration) {
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

    // 🛑 Prevent 'X' from playing the video
    removeBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        removeVideo(videoId, videoBlock);
    });

    // Click event to play the video
    videoBlock.addEventListener("click", () => {
        videoPreview.src = videoUrl;
        videoPreview.play();
    });

    // Append elements
    videoBlock.appendChild(thumbnail);
    videoBlock.appendChild(videoLabel);
    videoBlock.appendChild(durationLabel);
    videoBlock.appendChild(removeBtn);
    sortableList.appendChild(videoBlock);

    videoFiles.push({ id: videoId, url: videoUrl, name: fileName, duration });
}

// Drag & Drop Sorting
new Sortable(sortableList, {
    animation: 150,
    onEnd: () => {
        videoFiles = Array.from(sortableList.children).map((block) => {
            return videoFiles.find(v => v.id == block.dataset.id);
        });
    }
});

// Remove Video from Timeline
function removeVideo(videoId, videoBlock) {
    // Find the video being removed
    const removedVideo = videoFiles.find(v => v.id === videoId);

    // Remove from list
    videoFiles = videoFiles.filter(v => v.id !== videoId);
    videoBlock.remove();

    // 🛑 Stop the video if it’s playing
    if (videoPreview.src.includes(removedVideo.url)) {
        videoPreview.pause();
        videoPreview.src = "";
    }
}


// Merge & Play Videos Sequentially
mergeBtn.addEventListener("click", () => {
   
    if (videoFiles.length === 0) return;

    let currentIndex = 0;
    function playNext() {
        if (currentIndex < videoFiles.length) {
            videoPreview.src = videoFiles[currentIndex].url;
            videoPreview.play();
            videoPreview.onended = () => {
                currentIndex++;
                playNext();
            };
        }
    }
    playNext();
});



// Format duration as MM:SS
function formatDuration(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
}
