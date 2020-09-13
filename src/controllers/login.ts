import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import { AES, enc } from 'crypto-ts';

// Importaciones
import { MysqlConnection } from "../connection/mysql";
import { Common } from "../helper/common";

// Modelos
import { UserModel } from "../models/users";
import { RoleModel } from "../models/role";
import { RoleUserModel } from "../models/roleUser";

export class LoginController {

  private userModel: UserModel;
  private roleModel: RoleModel;
  private roleUserModel: RoleUserModel;
  private common: Common;

  constructor(private mysql: MysqlConnection) {
    this.common = new Common();
  }

  /**
   * Inicia los modelos
   * @param user
   * @param useTransac 
   */
  private async initModels(user?: any, useTransac: boolean = false) {
    return new Promise(async (resolve, reject) => {
      try {

        // Obtiene la transacción
        if (useTransac) await this.mysql.GetConnectionTrans();

        // Inicio de modelos
        this.userModel = new UserModel(this.mysql, (user || {}).id);
        this.roleModel = new RoleModel(this.mysql, (user || {}).id);
        this.roleUserModel = new RoleUserModel(this.mysql, (user || {}).id);
        resolve();
      } catch (error) {
        reject(error);
      }
    })
  }

  /**
   * POST /
   * Registra un usuario
   */
  public SingUp = async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next({
        status: 'error_val',
        errors: errors.array()
      });
    }

    try {

      await this.initModels((req as any).user, true)
      
      // Inicia la transacción
      this.mysql.Connection.beginTransaction();

      let user = await this.userModel.getAll({
        where: {
          query: 'email=?',
          values: [req.body.email]
        }
      });

      // Si ya esta siendo usado por otro usuario
      if (user.meta.total > 0) throw { message: 'El correo está siendo usado por otro usuario', code: 5 }

      // Encripta un password con AES
      let pass = AES.encrypt(req.body.password, process.env.SECRET_KEY_PASS).toString();;
      req.body.password = pass;

      // Agrega la acción
      let _user = await this.userModel.save(req.body);

      // Buscar el role por el role
      let role = await this.roleModel.find(null, {
        query: 'role=?',
        values: ['client']
      });

      // Agrega el role del usuario
      await this.roleUserModel.save({
        user_id: _user.id,
        role_id: role.id
      });

      // Genera el token
      let token = await this.generateToken({ ..._user, role });

      // Finaliza la transacción
      this.mysql.Connection.commit();

      try {
        this.mysql.Connection.release();
      } catch (error) {
        this.common.showLogMessage("Release ya eliminado");
      }

      // Se regresa la respuesta
      res.status(200)
        .header({
          Authorization: token
        })
        .json({
          status: "ok",
          response: _user
        });
    } catch (error) {
      // Realiza el rollback
      if (this.mysql.Connection && this.mysql.Connection.state == "authenticated") {
        this.mysql.Connection.rollback();

        try {
          this.mysql.Connection.release();
        } catch (error) {
          this.common.showLogMessage("Release ya eliminado");
        }
      }
      next(error);
    }
  };

  /**
   * POST /singin
   * Inicia sesión
   */
  public SingIn = async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next({
        status: 'error_val',
        errors: errors.array()
      });
    }

    try {
      await this.initModels();

      // Declaro la variable de respuesta
      let rpt: any;
      let token: any;

      // Obtiene datos del usuario
      let user = await this.userModel.getAll({
        where: {
          query: 'email=?',
          values: [req.body.email]
        },
        select: 'id,name,lastname,email,status,password'
      });

      // Si no existe el usuario
      if (!user.meta.total) {
        throw {
          message: 'El usuario no existe',
          code: 1
        }
      }

      // Valida si el usuario esta activo
      if (!user.data[0].status) throw { code: 0, statusCode: 401, message: 'El usuario se encuentra inactivo' };

      // Desencripta la contraseña
      var bytes = AES.decrypt(user.data[0].password, process.env.SECRET_KEY_PASS);
      var password = bytes.toString(enc.Utf8);

      // Si la contraseña es correcta
      if (req.body.password === password) {

        // Obtiene el role para enviarlo al token
        let roles = await this.userModel.getUserRoles(user.data[0].id);

        // Genera el token
        token = await this.generateToken({ ...user.data[0], role: roles });

        // Asigna la respuesta
        rpt = {
          id: user.data[0].id,
          name: user.data[0].name,
          lastname: user.data[0].lastname,
          email: user.data[0].email
        };

        // Se regresa la respuesta
        res.status(200)
          .header({
            Authorization: token
          })
          .json({
            status: "ok",
            response: { ...rpt, role: roles }
          });
      } else {
        throw {
          code: 3,
          message: 'Usuario o contraseña incorrecta!'
        };
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Metodos extra
   */
  private generateToken = async (user: any) => {
    return new Promise((resolve, reject) => {

      try {
        const privateKey = process.env.SECRET_KEY_JWT_API;

        // Firma el token
        let token = jwt.sign({
          "id": user.id,
          "name": user.name,
          "lastname": user.lastname,
          "email": user.email,
          "role": user.role
        }, privateKey,
          {
            algorithm: "HS256"
          }
        );

        resolve(token);
      } catch (error) {
        reject(`Error generando el  token: ${error}`);
      }
    })
  }
}

