import express, { Router } from "express";
import { check } from "express-validator";

// Importaciones
import { MysqlConnection } from "../connection/mysql";

// Controllers
import { LoginController } from "../controllers/login";

export class LoginRouter {

  private routes: Router;
  private loginController: LoginController;

  constructor(mysql: MysqlConnection) {
    // Inicia routes
    this.routes = express.Router();

    // Inicia los controladores
    this.loginController = new LoginController(mysql);
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
  * Monta las rutas para login
  */
  private mountRoutes() {

    // Registrar un usuario o registrar un usuario por red social
    this.routes.post("/signup",
      [
        check('name').exists().not().isEmpty().withMessage('El nombre del usuario es un campo requerido'),
        check('lastname').exists().not().isEmpty().withMessage('El apellido del usuario es un campo requerido'),
        check('email').exists().not().isEmpty().withMessage('El correo es un campo requerido'),
        check('email').isEmail().withMessage('El email debe estar en un formato correcto'),
        check('password').exists().not().isEmpty().withMessage('El password es un campo requerido')
      ], this.loginController.SingUp);

    // Inicio de sesión
    this.routes.post("/signin",
      [
        check('email').exists().not().isEmpty().withMessage('El correo es un campo requerido'),
        check('email').isEmail().withMessage('El email debe estar en un formato correcto'),
        check('password').exists().not().isEmpty().withMessage('El password es un campo requerido')
      ], this.loginController.SingIn);
  }
}