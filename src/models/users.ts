import { ModelMain } from "./modelMain";
import { MysqlConnection } from "../connection/mysql";

export class User {

  constructor(user?: User) {
    // Si hay usuario
    if (user) Object.assign(this, user);
  }

  id: string = undefined;
  name: string = undefined;
  lastname: string = undefined;
  email: string = undefined;
  password?: string = undefined;
  document_type?: string = undefined;
  document_number?: string = undefined;
  mobile_phone?: string = undefined;
  status?: boolean = undefined;
  modified_by?: string = undefined;
  created_at?: string = undefined;
  updated_at?: string = undefined;
}

const table: string = "users";

export class UserModel extends ModelMain<User> {

  private _mysql: MysqlConnection;

  constructor(mysql: MysqlConnection, user_id?: string) {
    super(table, new User(), mysql, user_id);
    // Asigna la variable de mysql
    this._mysql = mysql;
  }

  /**
   * Obtiene los roles de un usuario
   */
  public getUserRoles(id: string) {
    return new Promise<string[]>((resolve, reject) => {
      try {

        let Conn = this._mysql.Connection || this._mysql.Pool;

        // Establece la query
        let query =
          `SELECT r.role FROM role r 
        INNER JOIN role_users ru ON ru.role_id = r.id
        LEFT JOIN ${table} u ON u.id = ru.user_id
        WHERE u.id=?`;

        // Ejecuta la query
        Conn.query({
          sql: query,
          timeout: 15000,
          values: [id]
        }, (error: any, rows: any) => {

          // Si hay error
          if (error) {
            reject(error);
            return;
          }

          resolve((rows || []).map((r: any) => r.role));
        });
      } catch (error) {
        reject(error);
      }
    })
  }
}
