import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

// Importaciones
import { MysqlConnection } from "../connection/mysql";

// Modelos
import { RoleModel } from "../models/role";

export class RoleController {

  private roleModel: RoleModel;

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
        this.roleModel = new RoleModel(this.mysql, (user || {}).id);

        resolve();
      } catch (error) {
        reject(error);
      }
    })
  }

  /**
   * POST /
   * Añade un rol
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

      await this.initModels((req as any).user);

      // Agrega la acción
      let rpt = await this.roleModel.save(req.body);

      // Se regresa la respuesta
      next({
        status: 'create',
        ...rpt
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /
   * Actualiza un rol
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

      // Actualiza el registro
      let rpta = await this.roleModel.update(req.body);

      // Se regresa la respuesta
      next({
        status: 'ok',
        ...rpta[0]
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
      let dir = await this.roleModel.getAll({
        orderBy: req.query.order_by,
        select: req.query.include,
        page: req.query.page ? parseInt(req.query.page) : undefined,
        limit: req.query.limit,
        where: req.query.filters
      });

      // Se regresa la respuesta
      next({
        status: 'ok',
        ...dir
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /:id
   * Obtiene un role
   * @params include (Opcional)
   */
  public GetOne = async (req: any, res: Response, next: NextFunction) => {
    try {
      if (!req.params.id) throw { code: 0, message: "No ha proporcionado id de la dirección" };

      await this.initModels();

      // Obtiene el historial
      let rpta = await this.roleModel.find(req.params.id);

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
      let rpta = await this.roleModel.delete(req.params.id);

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

