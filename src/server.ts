import { createServer, Server as HTTPServer } from "http";
import express, { Application, Request, Response, NextFunction } from "express";
import socketIO from "socket.io";
import compression from "compression";
import bodyParser from "body-parser";
import path from "path";
import cors from "cors";

// Importaciones
import { ChampionSocket } from './socket';
import { Common } from './helper/common';
import { MysqlConnection } from './connection/mysql';

// Middlewares
import { ErrorMiddleware } from "./middleware/errorHandlers";
import { NotFoundMiddleware } from "./middleware/notFoundHandler";
import { ResponseMiddleware } from "./middleware/response";

// Rutas
import { LoginRouter } from "./routes/login";
import { RoleRouter } from "./routes/role";
import { RoleUserRouter } from "./routes/role_user";
import { UserRouter } from "./routes/user";

export class Server {

    private httpServer: HTTPServer;
    private app: Application;
    private mysqlConnection: MysqlConnection;

    constructor() {
        this.initialize();
    }

    private initialize(): void {

        this.app = express();
        this.httpServer = createServer(this.app);
        this.mysqlConnection = new MysqlConnection();

        // Inicia el socket
        let championSocket = new ChampionSocket(socketIO(this.httpServer));
        championSocket.handleSocketConnection();

        // Inicia la configuración de la app
        this.initApp();
        this.configureRoutes(championSocket);
        // Inicia los middelwares
        this.mountMiddlewares();

    }

    /**
     * Inicia la aplicación
     */
    private initApp(): void {

        this.app.disable("x-powered-by");
        this.app.use(compression());
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(cors({
            exposedHeaders: ['Authorization', 'authorization', 'Content-Length'],
        }));

        // Establece las respuestas del header
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
            res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
            next();
        });

        // Inicia la configuración de Mysql
        this.app.use(async (req: Request, res: Response, next: NextFunction) => {
            // Crea la conexión
            try {

                // Si no esta lo crea
                if (!this.mysqlConnection.Pool) {
                    await this.mysqlConnection.CreateConection();
                }
                next();
            } catch (error) {
                next(error);
            }
        });

        // Eventos al finalizar el servidor
        process.on('SIGINT', this.finishProccess);
        process.on('SIGTERM', this.finishProccess);
        process.on('uncaughtException', this.fatalError);
        process.on('unhandledRejection', this.fatalError);
    }

    /**
     * Establece las rutas
     */
    private mountMiddlewares(): void {

        const errorMid = new ErrorMiddleware();
        const notFound = new NotFoundMiddleware();
        const resMid = new ResponseMiddleware();

        // 404
        this.app.use(notFound.notFountHandler);

        // Manejo de errores
        this.app.use(errorMid.logErrors);
        this.app.use(errorMid.wrapErrors);
        this.app.use(errorMid.errorHandler);

        // Respuesta
        this.app.use(resMid.response);
    }

    /**
     * Inicia las rutas
     */
    private configureRoutes(championSocket: ChampionSocket): void {

        this.app.use(express.static(path.join(__dirname, "../public")));

        this.app.get("/admin", (req, res) => {
            res.sendFile("admin/index.html");
        });

        this.app.get("/client", (req, res) => {
            res.sendFile("client/index.html");
        });

        // Extras
        const loginRouter = new LoginRouter(this.mysqlConnection);
        const userRouter = new UserRouter(this.mysqlConnection);
        const roleRouter = new RoleRouter(this.mysqlConnection);
        const roleUserRouter = new RoleUserRouter(this.mysqlConnection);

        // Agrega las rutas
        this.app.use("/v1/login", loginRouter.getRoutes());
        this.app.use("/v1/user", userRouter.getRoutes());
        this.app.use("/v1/role/user", roleUserRouter.getRoutes());
        this.app.use("/v1/role", roleRouter.getRoutes());
        this.app.get("/v1/rooms", (req, res) => {
            res.status(200).json({
                status: 'OK',
                message: championSocket.getListVideos()
            })
        });
    }

    /**
     * Inicia el listener del server
     * @param callback 
     */
    public listen(callback: (port: number) => void): void {
        let port = parseInt(process.env.PORT);
        this.httpServer.listen(port, () => {
            callback(port);
        });
    }

    /**
     * Finaliza la ejecución del sistema
     */
    private finishProccess = () => {

        let common = new Common();

        // Si hay pool de MySql
        if (this.mysqlConnection.Pool) {

            // Realiza el rollback si una conexión quedo a medias
            if (this.mysqlConnection.Connection && this.mysqlConnection.Connection.state == "authenticated") {
                this.mysqlConnection.Connection.rollback();
                try {
                    this.mysqlConnection.Connection.release();
                } catch (error) {
                    common.showLogMessage("Release ya eliminado");
                }
            }

            // Cierra el pool de conexiones
            this.mysqlConnection.Pool.end((error: any) => {
                if (error) common.showLogMessage("No se pudo cerrar el pool de MySql", error, "error");
                else common.showLogMessage("Pool de MySql cerrado por cierre de proceso");
                process.exit();
            });

        } else process.exit();
    }

    /**
     * Controla el error cuando no es controlado por el sistema
     * @param error 
     */
    private fatalError = (error: any) => {
        let common = new Common();
        common.showLogMessage('Error no controlado correctamente', error);
        this.finishProccess();
    }
}