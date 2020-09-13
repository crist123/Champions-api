import * as boom from "@hapi/boom";
import { Common } from '../helper/common'

export class ErrorMiddleware {

  public logErrors = (err: any, req: any, res: any, next: any) => {
    // Si es un error
    if (!err.status) {
      let common = new Common();
      common.showLogMessage('Error controlado', err, 'error');
    }
    next(err);
  };

  public wrapErrors = (err: any, req: any, res: any, next: any) => {
    if (!err.isBoom) {
      next(boom.badImplementation("Error en el servidor", err));
    }
    else next(err);
  };

  public errorHandler = (err: any, req: any, res: any, next: any) => {

    // Si no es error
    if (err.data && err.data.status) return next(err.data);

    const { output: { statusCode, payload }, message, data } = err;

    let rt: any = {};

    // Establece el código de respuesta
    let code_status = data ? data.status_code || statusCode : statusCode;

    // Si estaba la propiedad de 'status_code' la elimina de la respuesta
    if (data && data.status_code) delete data.status_code;

    // Si hay data la agrega
    if (data) rt.data = data;
    else rt.payload = payload;

    next({
      status: 'error',
      code_status,
      error: rt,
      message
    })
  }
}