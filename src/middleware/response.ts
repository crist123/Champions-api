/**
 * Procesa la respuesta
 */
export class ResponseMiddleware {

  public response = (data: any, req: any, res: any, next: any) => {

    let statusCode = data.code_status;

    // Si hay estado
    switch (data.status) {
      case 'ok':
        delete data.status;
        delete data.code_status;
        res.status(statusCode || 200).json(this.Ok(data));
        break;
      case 'create':
        delete data.status;
        delete data.code_status;
        res.status(statusCode || 201).json(this.OkCreate(data));
        break;
      case 'error':
        delete data.status;
        delete data.code_status;
        res.status(statusCode || 500).json(this.Error(data));
        break;
      case 'error_val':
        delete data.status;
        delete data.code_status;
        res.status(statusCode || 422).json(this.ErrorValidation(data));
        break;
    }
  }

  /**
   * Responde Ok al servidor
   * @param data 
   * @param message 
   */
  private Ok(data?: any, message?: string) {
    return {
      status: "ok",
      response: message ? { message } : this.formatBody(data)
    }
  }

  /**
   * Responde Ok crear un registro al servidor
   * @param data 
   */
  private OkCreate(data?: any) {
    return {
      status: "ok",
      response: this.formatBody(data)
    }
  }

  /**
   * Responde error al servidor
   * @param error 
   * @param message 
   */
  private Error(error: any, message?: string) {

    let response: any = this.formatBody(error);

    // Si hay mensaje de error
    if (message) response.message = message;

    return {
      status: "error",
      response
    }
  }

  /**
   * Responde error al servidor cuando falla las validaciones
   * @param data 
   */
  private ErrorValidation(error: any) {

    let response: any = this.formatBody(error);
    response.message = "Los datos enviados son incorrectos";

    return {
      status: "error",
      response
    }
  }

  /**
   * Da formato correcto al objeto que va por el body, este valor puede ser formateado por el response de Express
   * @param body
   */
  private formatBody(body: any) {
    let objRes: any = {};

    if (body && typeof body != "string" && !Array.isArray(body)) {
      for (const key of Object.getOwnPropertyNames(body)) {
        objRes[key] = body[key];
      }
    } else objRes = body;

    return objRes;
  }
}