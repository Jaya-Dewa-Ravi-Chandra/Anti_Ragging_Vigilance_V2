let map;
let userMarker;
let distressUsers = [];
let mediaRecorder;
let recordedChunks = [];

function initMap() {
    map = L.map('map').setView([51.505, -0.09], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = [position.coords.latitude, position.coords.longitude];
                map.setView(pos, 13);
                userMarker = L.marker(pos).addTo(map).bindPopup("Your Location").openPopup();
            },
            () => {
                handleLocationError(true, map.getCenter());
            }
        );
    } else {
        handleLocationError(false, map.getCenter());
    }
}

function handleLocationError(browserHasGeolocation, pos) {
    alert(
        browserHasGeolocation
            ? "Error: The Geolocation service failed."
            : "Error: Your browser doesn't support geolocation."
    );
}

document.getElementById("clearUsernameButton").addEventListener("click", () => {
    localStorage.removeItem("username");
    window.location.href = "index.html"; // Redirect to welcome page
});

document.getElementById("sosButton").addEventListener("click", () => {
    const username = localStorage.getItem("username");
    if (!username) {
        alert("Please enter your username.");
        return;
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const pos = [position.coords.latitude, position.coords.longitude];

            distressUsers.push({ username, pos, recording: null, helpStatus: "Help Needed" });
            updateSidebar();
            updateMap();
            startDistressCheck(username);
        });
    } else {
        alert("Geolocation is not supported by this browser.");
    }
});

document.getElementById("startRecordingButton").addEventListener("click", startRecording);
document.getElementById("stopRecordingButton").addEventListener("click", stopRecording);

function displayUsername() {
    const username = localStorage.getItem("username");
    if (username) {
        document.getElementById("usernameSection").style.display = "none";
        document.getElementById("displayUsername").textContent = `Username: ${username}`;
        document.getElementById("clearUsernameButton").style.display = "inline-block";
        document.getElementById("startRecordingButton").style.display = "inline-block";
        document.getElementById("stopRecordingButton").style.display = "inline-block";
    } else {
        document.getElementById("usernameSection").style.display = "block";
        document.getElementById("clearUsernameButton").style.display = "none";
        document.getElementById("startRecordingButton").style.display = "none";
        document.getElementById("stopRecordingButton").style.display = "none";
    }
}

function updateSidebar() {
    const sidebar = document.getElementById("sidebar");
    sidebar.innerHTML = "<ul>";
    distressUsers.forEach((user, index) => {
        const userDiv = document.createElement("li");
        userDiv.innerHTML = `
            ${user.username} is in distress at (${user.pos[0]}, ${user.pos[1]})
            <br>
            <button onclick="acceptHelp(${index})">Accept Help Request</button>
            <span id="helpStatus${index}">${user.helpStatus}</span>
            ${user.recording ? `<br><a href="${user.recording}" download="recording.webm">Download Recording</a>` : ""}
        `;
        sidebar.appendChild(userDiv);
    });
    sidebar.innerHTML += "</ul>";
}

function updateMap() {
    distressUsers.forEach((user) => {
        L.marker(user.pos).addTo(map).bindPopup(`${user.username} is in distress`).openPopup();
    });
}

function startRecording() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = handleDataAvailable;
            mediaRecorder.start();
        })
        .catch(error => {
            console.error("Error accessing media devices.", error);
        });
}

function stopRecording() {
    if (mediaRecorder) {
        mediaRecorder.stop();
    }
}

function handleDataAvailable(event) {
    if (event.data.size > 0) {
        recordedChunks.push(event.data);
        saveRecording();
    }
}

function saveRecording() {
    const blob = new Blob(recordedChunks, {
        type: "video/webm"
    });
    const url = URL.createObjectURL(blob);
    const username = localStorage.getItem("username");
    const user = distressUsers.find(user => user.username === username);
    if (user) {
        user.recording = url;
        updateSidebar();
    }
}

function acceptHelp(index) {
    distressUsers[index].helpStatus = "Help is on the way";
    document.getElementById(`helpStatus${index}`).textContent = "Help is on the way";
}

function startDistressCheck(username) {
    const intervalId = setInterval(() => {
        const user = distressUsers.find(user => user.username === username);
        if (user) {
            showDistressPopup(username, intervalId);
        }
    }, 300000); // 5 minutes in milliseconds
}

function showDistressPopup(username, intervalId) {
    const popup = document.createElement("div");
    popup.className = "popup";
    popup.innerHTML = `
        <p>Is your issue resolved?</p>
        <button onclick="resolveIssue('${username}', true, ${intervalId})">Yes</button>
        <button onclick="resolveIssue('${username}', false, ${intervalId})">No</button>
    `;
    document.body.appendChild(popup);
}

function resolveIssue(username, isResolved, intervalId) {
    const popup = document.querySelector(".popup");
    if (popup) {
        document.body.removeChild(popup);
    }
    if (isResolved) {
        distressUsers = distressUsers.filter(user => user.username !== username);
        updateSidebar();
        updateMap();
        clearInterval(intervalId);
    } else {
        const userDiv = Array.from(document.querySelectorAll("#sidebar li")).find(li => li.textContent.includes(username));
        if (userDiv) {
            userDiv.classList.add("user-in-distress");
        }
    }
}

// Initialize the map and display the username if it exists
initMap();
displayUsername();