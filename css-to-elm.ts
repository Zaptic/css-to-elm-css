import postcss from 'postcss'
import scss from 'postcss-scss'
import * as fs from 'fs'
import slug from 'slug'
import * as _ from 'lodash'
import program from 'commander'

import * as Rules from './rules'

interface ElmRule {
    type: 'rule'
    name: string
    decls: Rules.ElmDecl[]
}

interface ElmComment {
    type: 'comment'
    content: string[]
}

type ElmNode = ElmRule | ElmComment

function extractSource(node: postcss.Node) {
    if (node.source.start && node.source.end) {
        const lines = (<any>node.source.input).css.split('\n')
        return lines.slice(node.source.start.line - 1, node.source.end.line)
    }
    return []
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
                const childNodes = convertNode(child, config).map(childElmNode => {
                    if (childElmNode.type === 'rule') {
                        return { ...childElmNode, name: `${node.selector}-${childElmNode.name}` }
                    } else {
                        return childElmNode
                    }
                })
                children.push(...childNodes)
            } else if (child.type === 'decl') {
                decls.push(convertDecl(child, config))
            } else {
                children.push({ type: 'comment', content: extractSource(child) })
            }
        }
        return [{ type: 'rule', name: node.selector, decls }, ...children]
    } else {
        return [{ type: 'comment', content: extractSource(node) }]
    }
    return []
}

function elmNodeToString(node: ElmNode): string {
    if (node.type === 'rule') {
        const rules = node.decls
            .map((decl: Rules.ElmDecl, index: number) => {
                const sep = index ? ',' : '['
                return `${sep} ${decl.name} ${decl.values.join(' ')}`
            })
            .join('\n        ')

        // Remove greater-than & ampersand syntax from the concatenated name
        const simplified = node.name.replace(/(&|>)/g, '')

        // Slugify to remove anything else & then camelCase for Elm
        const name = _.camelCase(slug(simplified))

        const text = `
${name} : Style
${name} =
    Css.batch
        ${rules || '['}
        ]
`
        return text
    } else if (node.type === 'comment') {
        return node.content.map(line => '-- ' + line).join('\n')
    }
    return ''
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

    /* Imports allow you to specify addition imports that you'd like included in the output. These might be used to
       expose standard colors that you have defined in your SCSS:

           imports: [
               'import Zap.Style.Color as Color'
           ],
    */
    imports: [],
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
            console.log('import Css exposing (..)')
            for (let import_ of config.imports) {
                console.log(import_)
            }
            console.log('\n')

            for (let node of result.root.nodes) {
                const elmNodes = convertNode(node, config)

                // Write out each node as Elm
                elmNodes.map(elmNode => console.log(elmNodeToString(elmNode)))
            }
        })
})
