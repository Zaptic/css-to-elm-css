import * as fs from 'fs'
import * as path from 'path'

import * as _ from 'lodash'
import postcss from 'postcss'
import scss from 'postcss-scss'
import slug from 'slug'
import program from 'commander'

import * as Rules from './rules'
import { Config, defaultConfig } from './config'

interface ElmRule {
    type: 'rule'
    name: string
    children: ElmNode[]
}

interface ElmComment {
    type: 'comment'
    content: string[]
}

type ElmNode = ElmRule | ElmComment | Rules.ElmDecl

function extractSource(node: postcss.Node) {
    if (node.source.start && node.source.end) {
        const lines = (<any>node.source.input).css.split('\n')
        return lines.slice(node.source.start.line - 1, node.source.end.line)
    }
    return []
}

function convertDecl(node: postcss.Declaration, config: Config): Rules.ElmDecl {
    if (node.type === 'decl') {
        const handler = Rules.lookup[node.prop] || Rules.standard
        return handler(node, config)
    }
    return { type: 'decl', name: '', values: [] }
}

function convertNode(node: postcss.Node, config: Config): ElmNode[] {
    if (node.type === 'rule') {
        const children: ElmNode[] = []
        for (let child of node.nodes || []) {
            if (child.type === 'rule') {
                const childNodes = convertNode(child, config).map(childElmNode => {
                    if (childElmNode.type === 'rule' && config.unnest) {
                        return { ...childElmNode, name: `${node.selector}-${childElmNode.name}` }
                    } else {
                        return childElmNode
                    }
                })
                children.push(...childNodes)
            } else if (child.type === 'decl') {
                children.push(convertDecl(child, config))
            } else {
                children.push({ type: 'comment', content: extractSource(child) })
            }
        }

        if (config.unnest) {
            return [{ type: 'rule', name: node.selector, children: [] }, ...children]
        } else {
            return [{ type: 'rule', name: node.selector, children }]
        }
    } else if (node.type === 'decl') {
        // Assume it is a variable declaration so strip the leading '$' and camelCase the rest
        return [
            {
                type: 'decl',
                name: _.camelCase(node.prop.replace('$', '')),
                values: [Rules.translateValue(node.value, config)],
            },
        ]
    } else {
        return [{ type: 'comment', content: extractSource(node) }]
    }
    return []
}

const symbolLookup: { [key: string]: string } = {
    '>': 'Global.children',
}

const globalRegex = /^:global\((.*)\)/

function elmRuleContentsToString(node: ElmRule): string {
    const rules = node.children
        .map((child: ElmNode, index: number) => {
            if (child.type === 'decl') {
                const sep = index ? ',' : '['
                return `${sep} ${child.name} ${child.values.join(' ')}`
            } else if (child.type === 'rule') {
                // TODO: This fails with comma separated selectors
                const names = child.name
                    .replace('\n', '')
                    .replace(/ +/g, ' ')
                    .split(',')
                    .map(str => str.trim())
                const all = []
                for (const name of names) {
                    const start = []
                    for (const entry of name.split(' ')) {
                        const globalMatch = entry.match(globalRegex)
                        if (entry[0] === '.') {
                            start.push(`Global.class "${_.camelCase(entry)}"`)
                        } else if (symbolLookup[entry] !== undefined) {
                            start.push(symbolLookup[entry])
                        } else if (globalMatch) {
                            start.push(`Global.class "${globalMatch[1]}"`)
                        } else if (/^[a-z]+$/.test(entry)) {
                            start.push(`Global.typeSelector "${entry}"`)
                        } else {
                            start.push(`Global.selector "${entry}"`)
                        }
                    }
                    all.push(start)
                }

                let selector = []
                if (all.length > 1) {
                    selector = ['each', '[', all.join(', '), ']']
                } else {
                    if (all[0].length > 1) {
                        selector = ['merge [', all[0].map(entry => `(${entry})`).join(', '), ']']
                    } else {
                        selector = [...all[0]]
                    }
                }

                const contents = elmRuleContentsToString(child)
                const sep = index ? ',' : '['
                return [sep, ...selector, contents].join(' ')
            } else if (child.type === 'comment') {
                const sep = index ? ',' : '['
                return `${sep} unknownNode "${child.content}"`
            }
        })
        .join('\n        ')

    const text = `
        ${rules || '['}
        ]
`
    return text
}

function elmNodeToString(node: ElmNode): string {
    if (node.type === 'rule') {
        // Remove greater-than & ampersand syntax from the concatenated name
        const simplified = node.name.replace(/(&|>)/g, '')

        // Slugify to remove anything else & then camelCase for Elm
        const name = _.camelCase(slug(simplified))

        const text = `
${name} : Style
${name} =
    Css.batch`
        return text + elmRuleContentsToString(node)
    } else if (node.type === 'decl') {
        return `${node.name} = ${node.values.join(' ')}`
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
let config = defaultConfig

if (configFilePath !== undefined) {
    config = {
        ...config,
        ...require(path.resolve(configFilePath)),
    }
}

fs.readFile(cssFilePath, (err, css) => {
    postcss([])
        .process(css, { syntax: scss })
        .then((result: any) => {
            // Write out an import statement for the top
            console.log('import Css exposing (..)')
            console.log('import Css.Global as Global')
            for (let import_ of config.imports) {
                console.log(import_)
            }
            console.log('\n')

            console.log(`

unknownNode string = Css.batch []

merge ops styles =
    let
        reduce entry prev =
            entry [ prev ]
    in
    List.foldr reduce (Css.batch styles) ops


`)

            for (let node of result.root.nodes) {
                const elmNodes = convertNode(node, config)

                // Write out each node as Elm
                // elmNodes.map(elmNode => elmNodeToString(elmNode))
                elmNodes.map(elmNode => console.log(elmNodeToString(elmNode)))
            }
        })
})
