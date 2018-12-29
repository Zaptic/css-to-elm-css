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

/* We want to turn something like 

      > button,
      a

   into ['> button', 'a']. In particular, it breaks on 'commas' so that we can each selector separately.
*/
function extractSelectors(name: string) {
    return name
        .replace('\n', '')
        .replace(/ +/g, ' ')
        .split(',')
        .map(str => str.trim())
}

const symbolLookup: { [key: string]: string } = {
    '>': 'Global.children',
}

const globalRegex = /^:global\((.*)\)/

/* Converts a selector like '> button' into:

   [ 'Global.children', 'Global.typeSelector "button"']

 */
function convertSelector(selector: string) {
    // Try to handle inserting 'decescendants' as needed by checking that there is no leading '&'
    // There are probably lots of ways of improving this
    const lead = selector[0] === '&' ? [] : ['Global.descendants <| List.singleton <|']

    // Test for entry string main entirely of lower case letters or h1 to h6
    const tagRegex = /^([a-z]+|h[1-6])$/

    return [
        ...lead,
        ...selector.split(' ').map(entry => {
            const globalMatch = entry.match(globalRegex)
            if (entry[0] === '.') {
                return `Global.class "${_.camelCase(entry)}"`
            } else if (symbolLookup[entry] !== undefined) {
                return symbolLookup[entry]
            } else if (globalMatch) {
                return `Global.class "${globalMatch[1].slice(1)}"`
            } else if (tagRegex.test(entry)) {
                return `Global.typeSelector "${entry}"`
            } else {
                return `Global.selector "${entry}"`
            }
        }),
    ]
}

function elmRuleContentsToString(node: ElmRule): string {
    const rules = node.children
        .map((child: ElmNode, index: number) => {
            if (child.type === 'decl') {
                const sep = index ? ',' : '['
                return `${sep} ${child.name} ${child.values.join(' ')}`
            } else if (child.type === 'rule') {
                const names = extractSelectors(child.name)
                const all = names.map(convertSelector)

                const contents = elmRuleContentsToString(child)
                return [
                    ...all.map((selector, selectorIndex) => {
                        const sep = index + selectorIndex ? ', ' : '['
                        return [sep, selector.join(' '), contents].join('')
                    }),
                ].join(' ')
            } else if (child.type === 'comment') {
                const sep = index ? ', ' : '['
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

function header(config: Config) {
    return `
module Style exposing (..)

import Css exposing (..)')
import Css.Global as Global')
${config.imports.join('\n')}
`
}

function helpers() {
    return `

unknownNode string = Css.batch []

merge ops styles =
    let
        reduce entry prev =
            entry [ prev ]
    in
    List.foldr reduce (Css.batch styles) ops
`
}

export function convertCss(css: string, config: Config) {
    return postcss([])
        .process(css, { syntax: scss })
        .then((result: any) => {
            const content = result.root.nodes.map((node: postcss.Node) => {
                return convertNode(node, config).map(elmNodeToString)
            })

            return content.join('\n')
        })
}

async function main() {
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

    fs.readFile(cssFilePath, async (err, css) => {
        const output = await convertCss(css.toString(), config)
        console.log(header(config))
        console.log(helpers())
        console.log(output)
    })
}

if (process.env.NODE_ENV !== 'test') {
    main()
}
