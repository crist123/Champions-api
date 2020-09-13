import * as boom from '@hapi/boom';

/**
 * Middleware not found
 */
export class NotFoundMiddleware {

  public notFountHandler = (req: any, res: any, next: any) => {
    const { output: { statusCode } } = boom.notFound();
    next({
      status: 'error',
      code_status: statusCode,
      message: "La ruta solicitada no existe"
    })
  }
}