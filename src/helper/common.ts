import moment from "moment";
import chalk from 'chalk';

export class Common {
    /**
     * Muestra una traza en el log con tiempo
     */
    public showLogMessage(...[text, error, type]: ConfigLog) {

        // Si envian un error el determina el tipo
        type ??= error ? 'error' : 'log';

        // Si no hay error lo deja en null para que sea ignorado por el console
        error ??= '(Sin info)';

        // Si es error
        if (type == 'error') console.trace(`${chalk.green(moment(moment.now()).format('YYYY-MM-DD hh:mm:ss'))} :: ${chalk.red(text)}`, error);
        else console.log(chalk.green(moment(moment.now()).format('YYYY-MM-DD hh:mm:ss')) + ` :: ${chalk.blue(text)}`, error);
    }

}

export enum Roles {
    CLIENT = 'client',
    ADMIN = 'admin'
}

/**
 * Configuración para la función de mensaje
 */
type ConfigLog =
    | [text: string, type?: 'error' | 'log']
    | [text: string, error: unknown, type?: 'error' | 'log']