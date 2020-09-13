/**
 * @type {RTCPeerConnection}
 */
let peerConnection;
let room_actually;
let session_id = sessionStorage.getItem('clientSessionId')

// Si no hay id de sesión
if (!session_id) {
    session_id = randomString(24)
   sessionStorage .setItem('clientSessionId', session_id)
}

const socket = io.connect("localhost:5000", { query: "sessionId=" + session_id });
const video = document.querySelector("video");
const talkingWithInfo = document.getElementById("talking-with-info");
const btnStop = document.getElementById("btn-stop");
const inputName = document.getElementById("input-name");
const activeVideoContainer = document.getElementById("active-video-container");

socket.on("offer", ({ message }) => {

    // Inicia la conexón remota
    peerConnection = new RTCPeerConnection({
        iceServers: [
            {
                "urls": "stun:stun.l.google.com:19302",
            },
        ]
    });

    // Usa la oferta remota y establece la conexión par con el
    peerConnection
        .setRemoteDescription(message.descriptor)
        .then(() => peerConnection.createAnswer())
        .then(sdp => peerConnection.setLocalDescription(sdp))
        .then(() => {
            // Emite la respuesta de conexión al que creo la 
            socket.emit("answer", {
                info: {
                    id: session_id,
                    room_id: room_actually,
                    descriptor: peerConnection.localDescription
                }
            });
        });

    // Evento cuando se agrega una nueva pista
    peerConnection.ontrack = event => {
        video.srcObject = event.streams[0];
    };

    // Evento cuando se envia un mensaje al dispositivo remoto
    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit("candidate", {
                info: {
                    room_id: room_actually,
                    candidate: event.candidate
                }
            });
        }
    };

    // Esconde los campos que no se van a usar
    activeVideoContainer.style.display = "none";
    inputName.style.display = "none";
    // Muestra el boton de stop
    btnStop.style.display = "block";
});

// Cuando llega un mensaje del dispositivo remoto
socket.on("candidate", ({ message }) => {
    // Si hay conexión
    if (peerConnection) {
        peerConnection
            .addIceCandidate(new RTCIceCandidate(message.candidate))
            .catch(e => console.error(e));
    }
});

// Cuando se conecte al socket intenta unirse a la sala que ya estaba
socket.on("connect", () => {
    if (room_actually) joinRoom(room_actually)
});

socket.on("stop-stream", () => {
    // Si hay conexión
    if (peerConnection) peerConnection.close();
    video.srcObject = null;

    // Aparece la lista de videos disponibles
    activeVideoContainer.style.display = "block";
    inputName.style.display = "block";
    btnStop.style.display = "none";

    // Establece el nombre del video
    talkingWithInfo.innerHTML = `La transmisión ha finalizado<br>Seleccione un video de la lista`;
});

// Evento nuevo video
socket.on("refresh-videos", ({ message }) => {
    console.info("refresh-videos", message)
    // Actualiza la lista de los videos
    updateVideosList(message)
});

window.onunload = window.onbeforeunload = () => {
    // Sale del video
    outVideo();
    socket.close();
};

/**
 * Se une a un video
 * @param {*} room_id 
 */
function joinRoom(room_id) {

    room_actually = room_id;

    socket.emit("join", {
        info: {
            room_id,
            name: inputName.value
        },
    });
}

/**
 * Crea la lista de videos disponibles
 * @param {*} room 
 */
function createVideoItemContainer(room) {

    const videoContainerEl = document.createElement("div");
    const videoNameEl = document.createElement("p");

    videoContainerEl.setAttribute("class", "active-video");
    videoContainerEl.setAttribute("id", room.id);
    videoNameEl.setAttribute("class", "videoname");
    videoNameEl.innerHTML = room.name;

    videoContainerEl.appendChild(videoNameEl);

    videoContainerEl.addEventListener("click", () => {
        joinRoom(room.id)

        // Establece el nombre del video
        talkingWithInfo.innerHTML = `Viendo: ${room.name}"`;
    });

    return videoContainerEl;
}

/**
 * Actualiza la lista de usuarios
 * @param {*} rooms 
 */
function updateVideosList(rooms) {
    let first = activeVideoContainer.children[0];
    activeVideoContainer.innerHTML = '';
    activeVideoContainer.appendChild(first);

    rooms.forEach(room => {
        activeVideoContainer.appendChild(createVideoItemContainer(room));
    });
}

/**
 * Inicia la conferencia
 */
function outVideo(removeHold) {

    // Si estaba en video
    if (room_actually) {
        if (peerConnection) peerConnection.close();
        video.srcObject = null;

        // Aparece la lista de videos disponibles
        activeVideoContainer.style.display = "block";
        inputName.style.display = "block";
        // Esconde el botón de salir
        btnStop.style.display = "none";
        
        // Establece el nombre del video
        talkingWithInfo.innerHTML = `La transmisión ha finalizado<br>Seleccione un video de la lista`;

        socket.emit("disconnect-user", {
            info: {
                room_id: room_actually,
                client_id: session_id,
                removeHold
            }
        });
        // Quita la sala actual
        room_actually = null;
    }
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

// Obtiene la lista de videos disponibles
fetch('http://localhost:5000/v1/rooms')
    .then((response) => {
        return response.json();
    })
    .then((data) => {
        updateVideosList(data.message)
    })
    .catch((err) => {
        console.error(err);
    });