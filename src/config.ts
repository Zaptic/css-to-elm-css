export interface Config {
    replacements: { [key: string]: string }
    imports: string[]
    unnest: boolean
}

export const defaultConfig: Config = {
    /* Replacements allow direct substitutions on values. Helpful for handling SCSS variables and replacing them with
       your own Elm variables, eg:

           replacements: {
               '$zaptic-grey-5': 'Color.grey5',
               '$zaptic-grey-7': 'Color.grey7',
               '$zaptic-red': 'Color.red',
           },

    */
    replacements: {},

    /* Imports allow you to specify addition imports that you'd like included in the output. These might be used to
       expose standard colors that you have defined in your SCSS:

           imports: [
               'import Zap.Style.Color as Color'
           ],
    */
    imports: [],

    unnest: false,
}
