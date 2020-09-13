import express, { Router } from "express";
import { check } from "express-validator";

// Importaciones
import { AuthMiddleware } from '../middleware/auth';
import { AuthorizationMiddleware } from '../middleware/authorization';
import { Roles } from '../helper/common';
import { MysqlConnection } from "../connection/mysql";

import { RoleController } from "../controllers/role";

export class RoleRouter {

  private routes: Router;
  private authM: AuthMiddleware;
  private authorizationM: AuthorizationMiddleware;
  private roleController: RoleController;

  constructor(mysql: MysqlConnection) {
    // Inicia routes
    this.routes = express.Router();
    this.authM = new AuthMiddleware();
    this.authorizationM = new AuthorizationMiddleware();

    // Inicia los controladores
    this.roleController = new RoleController(mysql);
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
  * Monta las rutas para roles
  */
  private mountRoutes() {
    // Agregar un rol
    this.routes.post("/",
      [
        this.authM.auth,
        this.authorizationM.authorize([Roles.ADMIN]),
        check('role').exists().not().isEmpty().withMessage('El role es un campo requerido'),
        check('name').exists().not().isEmpty().withMessage('El name de role es un campo requerido')
      ], this.roleController.Add);

    // Editar un rol
    this.routes.put("/",
      [
        this.authM.auth,
        this.authorizationM.authorize([Roles.ADMIN]),
        check("id").exists().not().isEmpty().withMessage("El campo id del role es requerido")
      ], this.roleController.Update);

    // Listar roles
    this.routes.get("/", [
      this.authM.auth,
      this.authorizationM.authorize([Roles.ADMIN])
    ], this.roleController.GetAll);

    // Buscar rol por id
    this.routes.get("/:id", [
      this.authM.auth,
      this.authorizationM.authorize([Roles.ADMIN])
    ], this.roleController.GetOne);

    // Eliminar rol
    this.routes.delete("/:id", [
      this.authM.auth,
      this.authorizationM.authorize([Roles.ADMIN])
    ], this.roleController.Delete);
  }
}