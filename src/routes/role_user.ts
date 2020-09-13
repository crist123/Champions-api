import express, { Router } from "express";
import { check } from "express-validator";

// Importaciones
import { AuthMiddleware } from '../middleware/auth';
import { AuthorizationMiddleware } from '../middleware/authorization';
import { Roles } from '../helper/common';
import { MysqlConnection } from "../connection/mysql";

import { RoleUserController } from "../controllers/roleUser";

export class RoleUserRouter {

  private routes: Router;
  private authM: AuthMiddleware;
  private authorizationM: AuthorizationMiddleware;
  private roleUserController: RoleUserController;

  constructor(mysql: MysqlConnection) {
    // Inicia routes
    this.routes = express.Router();
    this.authM = new AuthMiddleware();
    this.authorizationM = new AuthorizationMiddleware();

    // Inicia los controladores
    this.roleUserController = new RoleUserController(mysql);
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
  * Monta las rutas para asignaciones de usuario
  */
  private mountRoutes() {

    // Asignar un role a un usuario
    this.routes.post("/",
      [
        this.authM.auth,
        this.authorizationM.authorize([Roles.ADMIN]),
        check('user_id').exists().not().isEmpty().withMessage('El id del usuario es un campo requerido'),
        check('role_id').exists().not().isEmpty().withMessage('El id del rol es un campo requerido')
      ], this.roleUserController.Assign);

    // Editar asignación de un role a un usuario
    this.routes.put("/",
      [
        this.authM.auth,
        this.authorizationM.authorize([Roles.ADMIN]),
        check('id').exists().not().isEmpty().withMessage('El id es un campo requerido'),
        check('user_id').exists().not().isEmpty().withMessage('El id del usuario es un campo requerido'),
        check('role_id').exists().not().isEmpty().withMessage('El id del rol es un campo requerido')
      ], this.roleUserController.UpdateAssign);

    // Listar las asignaciones de rol
    this.routes.get("/", [
      this.authM.auth,
      this.authorizationM.authorize([Roles.ADMIN])
    ], this.roleUserController.GetAll);

    // Obtiene una asignación de rol
    this.routes.get("/:id", [
      this.authM.auth,
      this.authorizationM.authorize([Roles.ADMIN])
    ], this.roleUserController.GetOne);

    // Elimina una asignación de rol
    this.routes.delete("/:id", [
      this.authM.auth,
      this.authorizationM.authorize([Roles.ADMIN]),
    ], this.roleUserController.GetOne);
  }
}