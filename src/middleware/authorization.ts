import { Response, NextFunction } from "express";

export class AuthorizationMiddleware {

  /**
   * Autoriza el usuario de acuerdo a los permisos
   * @param roles 
   */
  public authorize(roles: string[]) {
    return (req: any, res: Response, next: NextFunction) => {

      // Si no se asigno asigna el valor
      roles ??= [];

      // Obtiene roles del usuario
      let roleUser = typeof (req.user.role) == 'string' ? [req.user.role] : req.user.role;

      // Variable para validar los roles
      let validate: boolean;

      // Recorre los roles del usuario y los con
      if (roleUser) {
        for (let i of roleUser) {
          // Valida si los roles permitidos incluye alguno del usuario
          validate = roles.includes(i);
          // si se cumple la validación termina el recorrido
          if (validate) break;
        }
      }
      else {
        // Si no se pasaron roles para la ruta permite continuar
        validate = !roles || !roles.length;
      }

      // Si la variable validate es false, seria permiso denegado
      if (!validate)
        return res.status(403).json({
          code: 0,
          message: "Permiso denegado"
        });

      // Continua al siguiente middleware
      next();
    };
  }
}