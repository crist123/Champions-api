import { ModelMain } from "./modelMain";
import { MysqlConnection } from "../connection/mysql";

export class Role {

  constructor(role?: Role) {
    // Si hay usuario
    if (role) Object.assign(this, role);
  }

  id: string = undefined;
  role: string = undefined;
  description: string = undefined;
  name?: string = undefined;
  modified_by: string = undefined;
  created_at?: string = undefined;
  updated_at?: string = undefined;
}

export class RoleModel extends ModelMain<Role> {
  constructor(mysql: MysqlConnection, user_id?: string) {
    super("role", new Role(), mysql, user_id);
  }
}
