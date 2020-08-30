const peerConnections = {};

// Obtiene los select de los dispositivos de audio y video
const videoElement = document.querySelector("video");
const typeTransSelect = document.querySelector("select#typeTrans");
const audioSelect = document.querySelector("select#audioSource");
const videoSelect = document.querySelector("select#videoSource");
const activeUserContainer = document.getElementById("active-user-container");
const pathVideo = document.getElementById("path");

// typeTransSelect.onchange = (event) => {
//     let value = event.srcElement.value;

//     const pathSect = document.getElementById("path-section");
//     const audioSect = document.getElementById("audio-section");
//     const videoSect = document.getElementById("video-section");

//     pathSect.style.display = 'none';
//     audioSect.style.display = 'none';
//     videoSect.style.display = 'none';

//     if (value == '0') {
//         audioSect.style.display = 'block';
//         videoSect.style.display = 'block';
//     }
//     else {
//         pathSect.style.display = 'block';
//     }
// }

var session_id = sessionStorage.getItem('sessionId')

// Si no hay id de sesión
if (!session_id) {
    session_id = randomString(24)
    sessionStorage.setItem('sessionId', session_id)
}

const socket = io.connect("localhost:5000", { query: "sessionId=" + session_id });

socket.on("answer", ({ message }) => {
    peerConnections[message.client_id].setRemoteDescription(message.descriptor);
});

socket.on("join", ({ message }) => {
    console.info("Event join", message)

    // Inicia la conexón remota
    const peerConnection = new RTCPeerConnection({
        iceServers: [
            {
                "urls": "stun:stun.l.google.com:19302",
            }
        ]
    });

    // Agrega el cliente al mapa de conexiones
    peerConnections[message.client_id] = peerConnection;

    // var stream = videoElement.captureStream()
    // console.info(mediaStream)

    // Obtiene el elemento de video y el stream
    let stream = videoElement.srcObject;
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

    // Evento candidate
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit("candidate", {
                info: {
                    id: message.client_id,
                    room_id: message.room_id,
                    candidate: event.candidate
                }
            });
        }
    };

    // Crea una oferta para pasarle al computador del cliente
    peerConnection.createOffer()
        .then(sdp => peerConnection.setLocalDescription(sdp))
        .then(() => {
            socket.emit("offer", {
                info: {
                    id: message.client_id,
                    room_id: message.room_id,
                    descriptor: peerConnection.localDescription
                }
            });
        });
});

// Evento candidate
socket.on("candidate", ({ message }) => {
    console.info("candidate", message)
    // Agrega el candidate al objeto de conexión
    peerConnections[message.client_id].addIceCandidate(new RTCIceCandidate(message.candidate));
});

socket.on("disconnect-user", ({ message }) => {
    console.info("disconnect-user", message)
    peerConnections[message.client_id].close();
    delete peerConnections[message.client_id];
});

socket.on("init-stream", ({ message }) => {
    console.info("init-stream", message)

    // Cambia el diseño de los botones
    let btnInit = document.getElementById('btn-init');
    let btnStop = document.getElementById('btn-stop');
    btnInit.style.display = 'none';
    btnStop.style.display = 'block';
});

socket.on("stop-stream", ({ message }) => {
    console.info("stop-stream", message)

    // Cambia el diseño de los botones
    let btnInit = document.getElementById('btn-init');
    let btnStop = document.getElementById('btn-stop');
    btnInit.style.display = 'block';
    btnStop.style.display = 'none';
});

// Evento nuevo video
socket.on("refresh-spectators", ({ message }) => {
    console.info("refresh-spectators", message)
    // Actualiza la lista de los videos
    updateUsersList(message)
});

window.onunload = window.onbeforeunload = () => {
    // Detiene la transmisión
    stopStream();
    socket.close();
};

// Eventos al cambiar la selección en dispositivos de video y audio
audioSelect.onchange = getStream;
videoSelect.onchange = getStream;

// Obtiene los dispositivos
getDevices().then(setDevices).then(getStream);

/**
 * Obtiene los dispositivos de multimedia
 */
function getDevices() {
    return navigator.mediaDevices.enumerateDevices();
}

/**
 * Establece los dispositivos
 * @param {any} deviceInfos 
 */
function setDevices(deviceInfos) {
    window.deviceInfos = deviceInfos;
    // Recorre los dispositivos
    for (const deviceInfo of deviceInfos) {
        const option = document.createElement("option");
        option.value = deviceInfo.deviceId;
        if (deviceInfo.kind === "audioinput") {
            option.text = deviceInfo.label || `Microphone ${audioSelect.length + 1}`;
            audioSelect.appendChild(option);
        } else if (deviceInfo.kind === "videoinput") {
            option.text = deviceInfo.label || `Camera ${videoSelect.length + 1}`;
            videoSelect.appendChild(option);
        }
    }
}

/**
 * Devuelve el stream de los dispositivos
 */
function getStream() {
    if (window.stream) {
        window.stream.getTracks().forEach(track => {
            track.stop();
        });
    }
    const audioSource = audioSelect.value;
    const videoSource = videoSelect.value;
    const constraints = {
        audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
        video: { deviceId: videoSource ? { exact: videoSource } : undefined }
    };
    return navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
            window.stream = stream;

            audioSelect.selectedIndex = [...audioSelect.options].findIndex(
                option => option.text === stream.getAudioTracks()[0].label
            );
            videoSelect.selectedIndex = [...videoSelect.options].findIndex(
                option => option.text === stream.getVideoTracks()[0].label
            );

            videoElement.srcObject = window.stream;
        })
        .catch((error) => console.error("Error: ", error));
}

/**
 * Crea la lista de videos disponibles
 * @param {*} user 
 */
function createUserItemContainer(user) {

    const userContainerEl = document.createElement("div");
    const userNameEl = document.createElement("p");

    userContainerEl.setAttribute("class", "active-user");
    userContainerEl.setAttribute("id", user.id);
    userNameEl.setAttribute("class", "username");
    userNameEl.innerHTML = user.name;

    userContainerEl.appendChild(userNameEl);

    return userContainerEl;
}

/**
 * Actualiza la lista de usuarios
 * @param {*} users 
 */
function updateUsersList(users) {
    let first = activeUserContainer.children[0];
    activeUserContainer.innerHTML = '';
    activeUserContainer.appendChild(first);

    users.forEach(user => {
        activeUserContainer.appendChild(createUserItemContainer(user));
    });
}

/**
 * Inicia la conferencia
 */
function initStream() {
    let name = document.getElementById('name');

    activeUserContainer.style.display = "block";

    socket.emit("init-stream", {
        info: {
            name: name.value
        }
    });
}

/**
 * Inicia la conferencia
 */
function stopStream(removeHold) {

    // Recorre las conexiones y las detiene
    for (const key in peerConnections) {
        peerConnections[key].close();
        delete peerConnections[key];
    }

    activeUserContainer.style.display = "none";

    socket.emit("stop-stream", {
        info: {
            room_id: session_id,
            removeHold
        }
    });
}

/**
 * Genera una cadena de caracteres aleatorea
 * @param {number} length 
 */
function randomString(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.*(';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}