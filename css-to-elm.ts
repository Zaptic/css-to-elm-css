import postcss from 'postcss'
import scss from 'postcss-scss'
import * as fs from 'fs'
import slug from 'slug'
import * as _ from 'lodash'
import program from 'commander'

import * as Rules from './rules'

interface ElmNode {
    name: string
    decls: Rules.ElmDecl[]
}

function convertDecl(node: postcss.Declaration, config: Rules.Config): Rules.ElmDecl {
    if (node.type === 'decl') {
        const handler = Rules.lookup[node.prop] || Rules.standard
        return handler(node, config)
    }
    return { name: '', values: [] }
}

function convertNode(node: postcss.Node, config: Rules.Config): ElmNode[] {
    if (node.type === 'rule') {
        const children: ElmNode[] = []
        const decls = []
        for (let child of node.nodes || []) {
            if (child.type === 'rule') {
                const childNodes = convertNode(child, config).map(childElmNode => ({
                    ...childElmNode,
                    name: `${node.selector}-${childElmNode.name}`,
                }))
                children.push(...childNodes)
            } else if (child.type === 'decl') {
                decls.push(convertDecl(child, config))
            }
        }
        return [{ name: node.selector, decls }, ...children]
    }
    return []
}

function elmNodeToString(node: ElmNode): string {
    const rules = node.decls
        .map((decl: Rules.ElmDecl) => {
            return `${decl.name} ${decl.values.join(' ')}`
        })
        .join('\n        , ')

    // Remove greater-than & ampersand syntax from the concatenated name
    const simplified = node.name.replace(/(&|>)/g, '')

    // Slugify to remove anything else & then camelCase for Elm
    const name = _.camelCase(slug(simplified))

    const text = `
${name} : Style
${name} =
    Css.batch
        [ ${rules}
        ]
`
    return text
}

program
    .version('0.1.0')
    .option('-c, --config [path]', 'Path to configuration file')
    .parse(process.argv)

const cssFilePath = program.args[0]
const configFilePath = program.config
const defaultConfig = {
    /* Replacements allow direct substitutions on values. Helpful for handling SCSS variables and replacing them with
       your own Elm variables, eg:

           replacements: {
               '$zaptic-grey-5': 'Color.grey5',
               '$zaptic-grey-7': 'Color.grey7',
               '$zaptic-red': 'Color.red',
           },

    */
    replacements: {},
}

let config = defaultConfig

if (configFilePath !== undefined) {
    config = require(configFilePath)
}

fs.readFile(cssFilePath, (err, css) => {
    postcss([])
        .process(css, { syntax: scss })
        .then((result: any) => {
            // Write out an import statement for the top
            console.log('import Css exposing (..)\n\n')

            for (let node of result.root.nodes) {
                const elmNodes = convertNode(node, config)

                // Write out each node as Elm
                elmNodes.map(elmNode => console.log(elmNodeToString(elmNode)))
            }
        })
})
