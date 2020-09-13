import { MysqlConnection } from '../connection/mysql';
import { v4 } from 'uuid';

export class ModelMain<T> {

    constructor(
        private table: string,
        private entidad: T,
        private mysql: MysqlConnection,
        private user_id?: string
    ) { }

    /**
     * Agrega un objeto a la tabla especificada deseada
     * @param data Información a guardar
     */
    public async save(data: T) {
        return new Promise<T>(async (resolve, reject) => {

            try {
                // Agrega el id al objeto
                (data as any).id = v4();
                (data as any).modified_by = this.user_id || ((data as any).user_id || 'System');

                let columns: string[] = [];
                let params: string[] = [];
                let values: any[] = [];
                let propsIgnore = ['created_at', 'updated_at']

                // Crea las columnas
                Object.keys(this.entidad).forEach(key => {

                    // Revisa solo las propiedades que tengan valor
                    if ((data as any)[key] !== undefined && !propsIgnore.includes(key)) {
                        // Columnas
                        columns.push(this.table + '.' + key);
                        // Parametros
                        params.push('?');
                        // Valores
                        values.push((data as any)[key]);
                    }
                });

                let Conn = this.mysql.Connection || this.mysql.Pool;

                // Establece la query
                let query = `INSERT INTO ${this.table} (${columns.join(',')}) VALUES (${params.join(',')})`;

                // Ejecuta la query
                Conn.query({
                    sql: query,
                    timeout: 15000,
                    values
                }, (error: any, rows: any) => {

                    // Si hay error
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(data);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Actualiza el objeto en la tabla deseada
     * @param data Información a guardar
     * @param filter Filtro para el update
     */
    public async update(data: T, filter?: [prop: string, value: string]) {
        return new Promise<T[]>(async (resolve, reject) => {
            try {

                // Si no hay filtro por defecto usa el filtro por id
                filter ??= ['id', (data as any).id];
                let propsIgnore = "updated_at,created_at";

                // Si hay registro lo actualiza
                (data as any).modified_by = this.user_id || ((data as any).user_id || 'System');

                let set: string[] = [];
                let values: any[] = [];

                // Crea las columnas
                Object.keys(this.entidad).forEach(key => {

                    // Revisa solo las propiedades que tengan valor y que sean necesarias actualizar
                    if ((data as any)[key] !== undefined && !propsIgnore.includes(key)) {
                        // Si es string agrega el valor con las comillas sencillas
                        set.push(`${this.table}.${key}=?`);
                        values.push((data as any)[key]);
                    }
                });

                if (set.length > 0) {

                    let Conn = this.mysql.Connection || this.mysql.Pool;

                    // Establece la query
                    let query = `UPDATE ${this.table} SET ${set.join(',')} WHERE ${filter[0]}=?`;

                    // Si se pasaron parámetros al filtro
                    values = values.concat(filter[1]);

                    // Ejecuta la query
                    Conn.query(query, values, (error: any, rows: any) => {

                        // Si hay error
                        if (error) {
                            reject(error);
                            return;
                        }

                        // Obtiene la info que acabo de actualizar
                        Conn.query(
                            `SELECT * FROM ${this.table} WHERE ${filter[0]}=?`, [filter[1]],
                            (error: any, rows: any) => {
                                // Si hay error
                                if (error) {
                                    reject(error);
                                    return;
                                }
                                resolve(rows);
                            }
                        );
                    });
                }
                else {
                    resolve([data]);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Actualiza el objeto en la tabla deseada
     * @param id Id del registro a buscar
     * @param filter Filtro para el update
     */
    public async find(id: string, filter?: { query: string, values: any[] }) {
        return new Promise<T>(async (resolve, reject) => {
            try {

                filter ??= { query: 'id=?', values: [id] };

                let Conn = this.mysql.Connection || this.mysql.Pool;

                // Establece la query
                let query = `SELECT * FROM ${this.table} WHERE ${filter.query}`;

                // Ejecuta la query
                Conn.query({
                    sql: query,
                    timeout: 15000,
                    values: filter.values
                }, (error: any, rows: any) => {

                    // Si hay error
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve(rows[0]);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Devuelve información de una tabla de acuerdo a la información dada
     * @param options
     */
    public getAll(options: ConfigGet): Promise<ModelResponse<T>> {
        return new Promise<ModelResponse<T>>(async (resolve, reject) => {

            try {
                let Conn = this.mysql.Connection || this.mysql.Pool;
                let params = options.where ? (options.where.values ?? []) : [];
                let typeOrder;

                // Agrega los campos adicionales
                if (options.orderBy) {
                    let partes = options.orderBy.split(' ');
                    options.orderBy = partes[0];
                    typeOrder = partes[1] ? partes[1] : 'DESC';
                }

                // Opciones por defecto
                options.page ??= 1;
                options.limit ??= 10;

                // Si limite es all, obtiene todos los registros
                let total = await this.getCount(options.where);
                options.limit = (options.limit == 'all') ? total : options.limit;
                let initPage = (options.page - 1) * options.limit;
                let cantPageDisponibles = Math.ceil(total / options.limit);

                // Establece la query
                let query = `SELECT ${options.select || `${this.table}.*`} FROM ${this.table}
                ${options.where && options.where.query ? `WHERE ${options.where.query}` : ''} 
                ${options.orderBy ? `ORDER BY ${options.orderBy} ${typeOrder}` : ''} 
                LIMIT ${initPage},${options.limit}`;

                // Ejecuta la query
                Conn.query({
                    sql: query,
                    timeout: 15000,
                    values: params
                }, (error: any, rows: T[]) => {
                    try {

                        // Si hay error
                        if (error) {
                            throw error;
                        }

                        resolve({
                            data: rows,
                            meta: {
                                page: total == 0 ? 0 : options.page,
                                pages: cantPageDisponibles || 0,
                                total
                            }
                        });
                    } catch (error) {
                        reject(error);
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Elimina una fila de la tabla
     * @param id Id del registro a buscar
     * @param filter Filtro para el update
     */
    public async delete(id: string, filter?: { query: string, values: any[] }) {
        return new Promise<T[]>(async (resolve, reject) => {
            try {

                filter ??= { query: 'id=?', values: [id] };

                // Busca el registro que va a eliminar
                let registros = await this.getAll({
                    limit: 'all',
                    where: filter
                });

                let Conn = this.mysql.Connection || this.mysql.Pool;

                // Establece la query
                let query = `DELETE FROM ${this.table} WHERE ${filter.query}`;

                // Ejecuta la query
                Conn.query({
                    sql: query,
                    timeout: 15000,
                    values: filter.values
                }, (error: any, rows: any) => {

                    // Si hay error
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve(registros.data);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Obtiene la cuenta total de registros
     * @param where
     */
    private async getCount(where?: { query: string, values: any[] }): Promise<number> {
        return new Promise<number>(async (resolve, reject) => {

            try {
                let Conn = this.mysql.Connection || this.mysql.Pool;

                let params = [];

                // Establece la query
                let query = `SELECT COUNT(${this.table}.id) as cuenta FROM ${this.table} 
                ${where && where.query ? `WHERE ${where.query}` : ''}`;

                // Si hay where
                if (where && where.query) {
                    // Si no paso información al where
                    if (!where.values) throw { code: 0, message: "Debe pasar información al where para la consulta" };
                    params = where.values;
                }

                // Ejecuta la query
                Conn.query({
                    sql: query,
                    timeout: 15000,
                    values: params
                }, (error: any, rows: any) => {

                    // Si hay error
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(rows[0].cuenta);
                });
            } catch (error) {
                reject(error);
            }
        });
    }
}

interface ConfigGet {
    /**
     * Define el orden
     */
    orderBy?: string;
    /**
     * Propiedades a incluir en el Select
     */
    select?: string;
    /**
     * Página deseada
     */
    page?: number;
    /**
     * Limite por página
     */
    limit?: 'all' | number;
    /**
     * Filtros a añadir en el Where
     */
    where?: { query: string, values: any[] };
}

class ModelResponse<T> {
    data: T[];
    meta: {
        page: number,
        pages: number,
        total: number
    }
}