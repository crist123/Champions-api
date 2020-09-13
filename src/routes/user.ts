import express, { Router } from "express";
import { check } from "express-validator";

// Importaciones
import { AuthMiddleware } from '../middleware/auth';
import { AuthorizationMiddleware } from '../middleware/authorization';
import { Roles } from '../helper/common';
import { MysqlConnection } from "../connection/mysql";

// Controllers
import { UserController } from "../controllers/user";

export class UserRouter {

  private routes: Router;
  private authM: AuthMiddleware;
  private authorizationM: AuthorizationMiddleware;
  private userController: UserController;

  constructor(mysql: MysqlConnection) {
    // Inicia routes
    this.routes = express.Router();
    this.authM = new AuthMiddleware();
    this.authorizationM = new AuthorizationMiddleware();

    // Inicia los controladores
    this.userController = new UserController(mysql);
  }

  /**
  * Establece las rutas para el router
  */
  public getRoutes(): Router {

    // Inicia las rutas
    this.mountRoutes();

    // Retorna las rutas
    return this.routes;
  }

  /**
  * Monta las rutas para usuarios
  */
  private mountRoutes() {

    // Registrar un usuario
    this.routes.post("/", [
      this.authM.auth,
      this.authorizationM.authorize([Roles.ADMIN, Roles.CLIENT]),
      check('name').exists().not().isEmpty().withMessage('El nombre del usuario es un campo requerido'),
      check('lastname').exists().not().isEmpty().withMessage('El apellido del usuario es un campo requerido'),
      check('email').exists().not().isEmpty().withMessage('El correo es un campo requerido'),
      check('email').isEmail().withMessage('El email debe estar en un formato correcto'),
      check('password').exists().not().isEmpty().withMessage('El password es un campo requerido'),
    ], this.userController.Add);

    // Editar un usuario
    this.routes.put("/status",
      [
        this.authM.auth,
        this.authorizationM.authorize([Roles.ADMIN, Roles.CLIENT]),
        check('id').exists().not().isEmpty().withMessage('El id del usuario es un campo requerido'),
        check('status').exists().not().isEmpty().withMessage('El status es un campo requerido')
      ], this.userController.UpdateStatus);

    // Editar un usuario
    this.routes.put("/",
      [
        this.authM.auth,
        this.authorizationM.authorize([Roles.ADMIN, Roles.CLIENT]),
        check('id').exists().not().isEmpty().withMessage('El id del usuario es un campo requerido'),
        check('name').exists().not().isEmpty().withMessage('El nombre del usuario es un campo requerido'),
        check('lastname').exists().not().isEmpty().withMessage('El apellido del usuario es un campo requerido')
      ], this.userController.Update);

    // Listar usuarios
    this.routes.get("/", [
      this.authM.auth,
      this.authorizationM.authorize([Roles.ADMIN]),
    ], this.userController.GetAll);

    // Buscar usuario por token
    this.routes.get("/token", [
      this.authM.auth,
      this.authorizationM.authorize([Roles.ADMIN, Roles.CLIENT]),
    ], this.userController.GetByToken);

    // Buscar usuario por id
    this.routes.get("/:id", [
      this.authM.auth,
      this.authorizationM.authorize([Roles.ADMIN])
    ], this.userController.GetOne);

    // Eliminar usuario
    this.routes.delete("/:id", [
      this.authM.auth,
      this.authorizationM.authorize([Roles.ADMIN])
    ], this.userController.Delete);
  }
}