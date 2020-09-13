import { ModelMain } from "./modelMain";
import { MysqlConnection } from "../connection/mysql";

export class RoleUser {

  constructor(roleUser?: RoleUser) {
    // Si hay usuario
    if (roleUser) Object.assign(this, roleUser);
  }

  id?: string = undefined;
  user_id?: string = undefined;
  role_id?: string = undefined;
  modified_by?: string = undefined;
  created_at?: string = undefined;
  updated_at?: string = undefined;
}

export class RoleUserModel extends ModelMain<RoleUser> {
  constructor(mysql: MysqlConnection, user_id?: string) {
    super("role_users", new RoleUser(), mysql, user_id);
  }
}
