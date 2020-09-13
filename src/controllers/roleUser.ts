import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

// Importaciones
import { MysqlConnection } from "../connection/mysql";

// Modelos
import { RoleUserModel } from "../models/roleUser";

export class RoleUserController {

  private roleUserModel: RoleUserModel;

  constructor(private mysql: MysqlConnection) { }

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

        resolve();
      } catch (error) {
        reject(error);
      }
    })
  }

  /**
   * POST /
   * Asigna un role en un usuario
   */
  public Assign = async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next({
        status: 'error_val',
        errors: errors.array()
      });
    }

    try {

      await this.initModels((req as any).user);

      let arrRpt = [];

      let userAssigned = await this.roleUserModel.getAll({
        where: {
          query: 'user_id=?',
          values: [req.body.user_id]
        }
      })

      const roles = typeof (req.body.role_id) == 'string' ? [req.body.role_id] : req.body.role_id;

      // Recorre los roles
      for (let role of roles) {
        // Valida si ya tiene la asignación
        let val = userAssigned.data.find(ua => ua.role_id == role);

        if (!val) {
          // Agrega la asignación
          let roleUser = await this.roleUserModel.save({
            user_id: req.body.user_id,
            role_id: role
          });

          arrRpt.push(roleUser);
        }
      }

      // Si no se asigno ningún rol
      if (!arrRpt.length) {
        arrRpt.push({ message: 'Los roles ya estaban asignados' });
      }

      // Se regresa la respuesta
      next({
        status: 'create',
        ...arrRpt
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /
   * Actualiza un role asignado a un usuario por id de asignación
   */
  public UpdateAssign = async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return next({
        status: 'error_val',
        errors: errors.array()
      });
    }

    try {
      await this.initModels((req as any).user);

      let rpt = await this.roleUserModel.update(req.body);

      // Se regresa la respuesta
      next({
        status: 'ok',
        ...rpt
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
      let rpt = await this.roleUserModel.getAll({
        orderBy: req.query.order_by,
        select: req.query.include,
        page: req.query.page ? parseInt(req.query.page) : undefined,
        limit: req.query.limit,
        where: req.query.filters
      });

      // Se regresa la respuesta
      next({
        status: 'ok',
        ...rpt
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /:id
   * Obtiene una asignación de un role a un usuario por id de la asignación
   */
  public GetOne = async (req: any, res: Response, next: NextFunction) => {
    try {
      if (!req.params.id) throw { code: 0, message: "No ha proporcionado id de la dirección" };

      await this.initModels();

      // Obtiene el historial
      let rpta = await this.roleUserModel.find(req.params.id);

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
   * DELETE /:id
   * Elimina un registro de la tabla
   */
  public Delete = async (req: Request, res: Response, next: NextFunction) => {

    try {

      if (!req.params.id) throw { code: 0, message: "No ha proporcionado id para eliminar" };

      await this.initModels((req as any).user);

      // Elimina el registro
      let rpta = await this.roleUserModel.delete(req.params.id);

      // Se regresa la respuesta
      next({
        status: 'ok',
        ...rpta
      });
    } catch (error) {
      next(error);
    }
  }
}

