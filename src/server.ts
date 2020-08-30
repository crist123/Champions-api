import express, { Application } from "express";
import socketIO, { Server as SocketIOServer, Socket } from "socket.io";
import { createServer, Server as HTTPServer } from "http";
import path from "path";

export class Server {

    private httpServer: HTTPServer;
    private app: Application;
    private io: SocketIOServer;
    private rooms: Map<string, Room>;
    private readonly DEFAULT_PORT = 5000;
    private inHold: { [key: string]: Socket };

    constructor() {
        this.initialize();
    }

    private initialize(): void {

        this.app = express();
        this.httpServer = createServer(this.app);
        this.io = socketIO(this.httpServer);
        this.rooms = new Map<string, Room>();
        this.inHold = {};

        this.initApp();
        this.configureRoutes();
        this.handleSocketConnection();
    }

    /**
     * Inicia la aplicación
     */
    private initApp(): void {
        this.app.use(express.static(path.join(__dirname, "../public")));
    }

    /**
     * Inicia las rutas
     */
    private configureRoutes(): void {

        this.app.get("/admin", (req, res) => {
            res.sendFile("admin/index.html");
        });

        this.app.get("/client", (req, res) => {
            res.sendFile("client/index.html");
        });

        this.app.get("/api/rooms", (req, res) => {
            res.status(200).json({
                status: 'OK',
                message: this.getListVideos()
            })
        });
    }

    private handleSocketConnection(): void {
        this.io.sockets.on("error", (e: any) => console.log(e));
        this.io.sockets.on("connection", socket => {

            const id = socket.request._query['sessionId'] || socket.id;
            console.info("Nueva conexión", id)

            let room = this.rooms.get(id);
            let inRoom = false;

            // Actualiza la conexión del presentador si es inestable
            if (room) {
                room.presentator = socket;
                inRoom = true;
            }
            else {
                let room = this.findRoomForClient(id);
                // Si encuentra la sala del cliente
                if (room) {
                    room.spectators[id].socket = socket;
                    inRoom = true;
                }
            }

            // Si no esta en sala esta en el hold
            if (!inRoom) this.inHold[id] = socket;

            // Evento de inicio de streaming
            socket.on("init-stream", (data) => {
                this.initStream(data, socket, id)
            });

            // Evento de fin de streaming
            socket.on("stop-stream", ({ info }) => {
                let room = this.rooms.get(info.room_id);

                // Busca la sala
                if (room) {

                    // Recorre los espectadores
                    for (const key in room.spectators) {

                        // Agrega el espectador al hold
                        this.inHold[key] = room.spectators[key].socket;

                        // Envia el evento de fin a los espectadores
                        this.sendMessage('stop-stream', {
                            status: 'OK',
                            message: {
                                room_id: info.room_id
                            }
                        }, room.spectators[key].socket);
                    }

                    // Agrega el presentador al hold
                    if (!info.removeHold) this.inHold[info.room_id] = room.presentator;

                    // Devuelve la respuesta
                    this.sendMessage('stop-stream', {
                        status: 'OK',
                        message: {
                            room_id: info.room_id
                        }
                    }, room.presentator);

                    // Elimina el video de la lista
                    this.rooms.delete(info.room_id)

                    // Actualiza los videos a todos los espectadores en hold
                    this.sendUpdateVideos()
                }
            });

            // Evento de fin de streaming
            socket.on("disconnect-user", ({ info }) => {
                let room = this.rooms.get(info.room_id);

                // Busca la sala
                if (room) {

                    let stectator = room.spectators[info.client_id];

                    if (stectator) {

                        // Agrega el espectador al hold
                        if (!info.removeHold)
                            this.inHold[info.client_id] = room.spectators[info.client_id].socket;

                        // Elimina el cliente
                        delete room.spectators[info.client_id];

                        // Devuelve la respuesta
                        this.sendMessage('disconnect-user', {
                            status: 'OK',
                            message: {
                                client_id: info.client_id
                            }
                        }, room.presentator);

                        // Actualiza la lista de espectadores en el video
                        this.sendUpdateSpectators(room);
                    }
                }
            });

            // Evento cuando se une un usuario a un video
            socket.on("join", ({ info }) => {
                let room = this.rooms.get(info.room_id);
                if (room) {

                    let client = room.searchClient(id);

                    // Si no esta el cliente lo agrega
                    if (!client) {
                        room.spectators[id] = {
                            socket,
                            name: info.name
                        };

                        // Saca al espectador del hold
                        delete this.inHold[id];
                    }

                    // Devuelve la respuesta
                    this.sendMessage('join', {
                        status: 'OK',
                        message: {
                            room_id: info.room_id,
                            client_id: id
                        }
                    }, room.presentator);

                    // Actualiza la lista de espectadores en el video
                    this.sendUpdateSpectators(room);
                }
            });

            // Evento de paso de oferta entre dos maquinas
            socket.on("offer", (data) => {
                let room = this.rooms.get(data.info.room_id);

                // Si encuentra la sala
                if (room) {
                    let client = room.searchClient(data.info.id);

                    // Si el cliente esta en la sala
                    if (client) {

                        // Devuelve la respuesta
                        this.sendMessage('offer', {
                            status: 'OK',
                            message: {
                                room_id: data.info.room_id,
                                descriptor: data.info.descriptor
                            }
                        }, client);
                    }
                }
            });

            // Cuando hay respuesta del cliente en la conexión a un video
            socket.on("answer", ({ info }) => {
                let room = this.rooms.get(info.room_id);

                // Si encontro la sala
                if (room) {

                    let client = room.searchClient(id);

                    // Si encuentra el cliente
                    if (client) {
                        // Devuelve la respuesta
                        this.sendMessage('answer', {
                            status: 'OK',
                            message: {
                                room_id: info.room_id,
                                descriptor: info.descriptor,
                                client_id: info.id
                            }
                        }, room.presentator);
                    }
                }
            });

            // Evento al compartirse mensajes entre los dispositivos
            socket.on("candidate", ({ info }) => {

                let room = this.rooms.get(info.room_id);

                // Si hay sala
                if (room) {
                    var client: Socket;

                    // Si se va a enviar hacia un cliente
                    if (info.id) client = room.searchClient(info.id);
                    else client = room.presentator;

                    // Devuelve la respuesta
                    this.sendMessage('candidate', {
                        status: 'OK',
                        message: {
                            room_id: info.room_id,
                            candidate: info.candidate,
                            client_id: id
                        }
                    }, client);
                }
            });

            socket.on("disconnect", () => {
                console.info("disconnect", id);
                // Busca primero el cliente como administrador de sala
                // let room = this.rooms.get(id);

                // // Si el cliente es un administrador envia a todos los usuarios de la sala la desconexión
                // if (room) {
                //     for (const client of room.clients) {
                //         client.emit('room-close', true);
                //     }

                //     this.rooms.delete(id);
                // }
                // else {
                //     // Recorre las salas en busca del usuario
                //     this.rooms.forEach(room => {
                //         let index = room.searchClient(id);

                //         // Busca el cliente en la sala
                //         if (index >= 0) {
                //             room.clients.splice(index);
                //             return;
                //         }
                //     })
                // }
            });
        });
    }

    /**
     * Agrega un nuevo cliente a una sala
     * @param conectData 
     * @param client 
     * @param id 
     */
    private initStream(conectData: ConnectMessage, client: Socket, id: string) {

        // Si la conexión es de un presentador
        let room = this.rooms.get(id);

        // Si no se ha creado la sala
        if (!room) {

            let _room = new Room();
            _room.spectators = {};
            _room.data = conectData.info;
            _room.presentator = client;

            // Saca al presentador del hold
            delete this.inHold[id];

            // Agrega la sala
            this.rooms.set(id, _room);

            // Actualiza los videos a todos los espectadores en hold
            this.sendUpdateVideos();

            // Devuelve la respuesta
            this.sendMessage('init-stream', {
                status: 'OK',
                message: { id }
            }, client);
        }
    }

    /**
     * Busca la sala a la que pertenece un cliente
     * @param id 
     */
    private findRoomForClient(id: string) {

        let room: Room;

        // Recorre las salas en busca del cliente
        for (const [key, _room] of this.rooms) {
            let client = _room.searchClient(id);
            // Si encuentra el cliente lo regresa
            if (client) {
                room = _room;
                break;
            }
        }

        return room;
    }

    /**
     * Actualiza los videos
     */
    private sendUpdateVideos() {
        for (const key in this.inHold) {

            // Devuelve la respuesta
            this.sendMessage('refresh-videos', {
                status: 'OK',
                message: this.getListVideos()
            }, this.inHold[key]);
        }
    }

    /**
     * Actualiza los espectadores en un video
     */
    private sendUpdateSpectators(room: Room) {

        var list = [];

        // Recorre las salas y establece la lista
        for (const key in room.spectators) {
            list.push({
                id: key,
                name: room.spectators[key].name
            })
        }

        // Devuelve la respuesta
        this.sendMessage('refresh-spectators', {
            status: 'OK',
            message: list
        }, room.presentator);
    }

    /**
     * Devuelve respuesta a un cliente
     * @param event Evento a responder
     * @param data Información a enviar
     * @param room_id Identificación de la sala para enviarle respuesta a todos los clientes en ella
     */
    private sendMessage(event: string, data: Message, room_id?: string): void;
    /**
     * Devuelve respuesta a un cliente
     * @param event Evento a responder
     * @param data Información a enviar
     * @param client Cliente a responder
     */
    private sendMessage(event: string, data: Message, client?: Socket): void;
    private sendMessage(event: string, data: Message, sendTo: any): void {

        // Si es una sala
        if (typeof (sendTo) == 'string') {
            // Obtiene los clientes
            let room = this.rooms.get(sendTo);

            // Emite a todos los clientes de la sala
            for (const key in room.spectators) {
                room.spectators[key].socket.emit(event, data);
            }
        }
        // Emite solo al cliente
        else (sendTo as Socket).emit(event, data);
    }

    /**
     * Obtiene la lista de transmisiones actuales
     */
    private getListVideos() {
        let list = [];

        // Recorre las salas y establece la lista
        for (const [key, room] of this.rooms) {
            list.push({
                id: key,
                name: room.data.name
            })
        }

        return list;
    }

    public listen(callback: (port: number) => void): void {
        this.httpServer.listen(this.DEFAULT_PORT, () => {
            callback(this.DEFAULT_PORT);
        });
    }
}

interface Message {
    status: 'OK' | 'ERROR';
    message: any;
}

interface ConnectMessage {
    room_id?: string;
    info?: InfoRoom;
}

class Room {

    data: InfoRoom;
    spectators: { [key: string]: Spectator };
    presentator: Socket;

    /**
     * Busca un cliente en la sala y devuelve su ubicación
     */
    public searchClient = (client_id: string): Socket | null => {
        return this.spectators[client_id] ? this.spectators[client_id].socket : null;
    }
}

interface Spectator {
    name: string;
    socket: Socket;
}

interface InfoRoom {
    name: string;
}