import mysql, { Pool, PoolConnection } from "mysql";

export class MysqlConnection {

  public Connection: PoolConnection;
  public Pool: Pool;
  private config: ConfigConnection;

  constructor() {
    // Define la configuración
    this.config = {
      host: process.env.HOST_DB,
      database: process.env.DB,
      user: process.env.USER_DB,
      password: process.env.PASS_DB,
      acquireTimeout: 10000,
      connectionLimit: 10
    }
  }

  /**
   * Crea una conexión nueva a la BD
   */
  public CreateConection = (): Promise<Pool> => {
    return new Promise<Pool>((resolve, reject) => {

      if (this.Pool) this.Pool.end((err) => {

        // Si hubo error al finalizar la conexión
        if (err) console.info('error', err);

        this.Pool = null;
        this.Pool = mysql.createPool(this.config);

        this.Pool.on('error', (error) => {
          console.info('error', error);
          this.CreateConection();
        })

        resolve(this.Pool)
      })
      else {
        this.Pool = mysql.createPool(this.config);

        this.Pool.on('error', (error) => {
          this.CreateConection();
        })

        resolve(this.Pool)
      }
    });
  };

  /**
   * Obtiene una conexión
   */
  public GetConnectionTrans = (): Promise<PoolConnection> => {
    return new Promise<PoolConnection>((resolve, reject) => {

      // Realiza la conexíon
      this.Pool.getConnection((err: any, con: PoolConnection) => {
        try {
          if (err) throw err;

          con.on('error', (error) => {
            console.info('error', error);
            this.GetConnectionTrans();
          })

          try {
            // Cierra la conexión si es necesario
            if (this.Connection) this.Connection.release();
          } catch (error) {
            console.info('No se cierra pool', error);
          }

          this.Connection = con;

          resolve(con);
        } catch (error) {
          reject(error);
        }
      });
    });
  };
}

export interface ConfigConnection {
  host: string;
  database: string;
  user: string;
  password: string;
  acquireTimeout: number;
  connectionLimit: number;
};