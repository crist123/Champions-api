import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { AES } from 'crypto-ts';

// Importaciones
import { MysqlConnection } from "../connection/mysql";
import { Common } from "../helper/common";

// Modelos
import { UserModel } from "../models/users";
import { RoleUserModel } from "../models/roleUser";

export class UserController {

  private userModel: UserModel;
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
        this.roleUserModel = new RoleUserModel(this.mysql, (user || {}).id);
        this.userModel = new UserModel(this.mysql, (user || {}).id);

        resolve();
      } catch (error) {
        reject(error);
      }
    })
  }

  /**
   * POST /
   * Agrega un usuario
   */
  public Add = async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next({
        status: 'error_val',
        errors: errors.array()
      });
    }

    try {

      await this.initModels((req as any).user, true);

      // Inicia la transacción
      this.mysql.Connection.beginTransaction();

      // Encripta un password con AES
      let pass = AES.encrypt(req.body.password, process.env.SECRET_KEY_PASS).toString();;
      req.body.password = pass;

      // Agrega la acción
      let rpt = await this.userModel.save(req.body);

      // Agrega el role del usuario
      await this.roleUserModel.save({
        user_id: rpt.id,
        role_id: req.body.role_id
      });

      // Finaliza la transacción
      this.mysql.Connection.commit();

      try {
        this.mysql.Connection.release();
      } catch (error) {
        this.common.showLogMessage("Release ya eliminado");
      }

      // Se regresa la respuesta
      next({
        status: 'create',
        ...rpt
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
  }

  /**
   * PUT /status
   * Actualiza status de un usuario
   */
  public UpdateStatus = async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next({
        status: 'error_val',
        errors: errors.array()
      });
    }

    try {
      await this.initModels((req as any).user);

      let user = await this.userModel.find(req.body.id);
      if (!user) throw { code: 0, message: 'Usuario no encontrado' };

      // Actualiza el registro
      let rpta = await this.userModel.update(req.body);

      // Recorre los usuarios
      for (const _user of rpta) {
        delete _user.password;
      }

      // Se regresa la respuesta
      next({
        status: 'ok',
        ...rpta
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /
   * Actualiza un usuario
   */
  public Update = async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next({
        status: 'error_val',
        errors: errors.array()
      });
    }

    try {
      await this.initModels((req as any).user);

      // valida si actualizar el password
      if (req.body.password) {
        // Encripta un password con AES
        let pass = AES.encrypt(req.body.password, process.env.SECRET_KEY_PASS).toString();;
        req.body.password = pass;
      }

      // Actualiza el registro
      let rpta = await this.userModel.update(req.body);

      // Recorre los usuarios
      for (const _user of rpta) {
        delete _user.password;
      }

      // Se regresa la respuesta
      next({
        status: 'ok',
        ...rpta
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /
   * Obtiene todos los registros
   * @params order_by (Opcional)
   * @params include (Opcional)
   * @params page (Opcional)
   * @params limit (Opcional)
   * @params filters (Opcional)
   */
  public GetAll = async (req: any, res: Response, next: NextFunction) => {
    try {

      await this.initModels();

      // Obtiene los registros
      let user = await this.userModel.getAll({
        orderBy: req.query.order_by,
        select: req.query.include,
        page: req.query.page ? parseInt(req.query.page) : undefined,
        limit: req.query.limit,
        where: req.query.filters
      });

      // Recorre los usuarios
      for (const _user of user.data) {
        delete _user.password;
      }

      // Se regresa la respuesta
      next({
        status: 'ok',
        ...user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /:id
   * Obtiene un role
   */
  public GetOne = async (req: any, res: Response, next: NextFunction) => {
    try {
      if (!req.params.id) throw { code: 0, message: "No ha proporcionado id del usuario" };

      await this.initModels();

      // Obtiene el historial
      let rpta = await this.userModel.find(req.params.id);
      delete rpta.password;

      // Se regresa la respuesta
      next({
        status: 'ok',
        ...rpta
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /token
   * Obtiene información del usuario contenida en el token
   */
  public GetByToken = async (req: any, res: Response, next: NextFunction) => {
    try {

      await this.initModels();

      // Busca los datos del usuario por el id del token
      let rpta = await this.userModel.getAll({
        where: {
          query: 'id=?',
          values: [(req as any).user.id]
        },
        select: 'id,name,lastname,email,document_type,document_number,mobile_phone'
      })

      // Se regresa la respuesta
      next({
        status: 'ok',
        ...rpta.data[0]
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /:id
   * Elimina un registro de la tabla
   */
  public Delete = async (req: Request, res: Response, next: NextFunction) => {

    try {

      if (!req.params.id) throw { code: 0, message: "No ha proporcionado id para eliminar" };

      await this.initModels((req as any).user, true);

      // Inicia la transacción
      this.mysql.Connection.beginTransaction();

      // Elimina role user
      await this.roleUserModel.delete(null,
        {
          query: 'user_id=?',
          values: [req.params.id]
        })

      // Elimina el usuario
      let rpta = await this.userModel.delete(req.params.id);

      // Finaliza la transacción
      this.mysql.Connection.commit();

      try {
        this.mysql.Connection.release();
      } catch (error) {
        this.common.showLogMessage("Release ya eliminado");
      }

      // Se regresa la respuesta
      next({
        status: 'create',
        ...rpta
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
  }
}