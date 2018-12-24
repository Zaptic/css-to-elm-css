import postcss from 'postcss'
import scss from 'postcss-scss'
import * as fs from 'fs'
import slug from 'slug'
import * as _ from 'lodash'

import * as Rules from './rules'

interface ElmNode {
    name: string
    decls: Rules.ElmDecl[]
}

function convertDecl(node: postcss.Declaration): Rules.ElmDecl {
    if (node.type === 'decl') {
        const handler = Rules.lookup[node.prop] || Rules.standard
        return handler(node)
    }
    return { name: '', values: [] }
}

function convertNode(node: postcss.Node): ElmNode[] {
    if (node.type === 'rule') {
        const children: ElmNode[] = []
        const decls = []
        for (let child of node.nodes || []) {
            if (child.type === 'rule') {
                const childNodes = convertNode(child).map(childElmNode => ({
                    ...childElmNode,
                    name: `${node.selector}-${childElmNode.name}`,
                }))
                children.push(...childNodes)
            } else if (child.type === 'decl') {
                decls.push(convertDecl(child))
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

const cssFilePath = process.argv[2]

fs.readFile(cssFilePath, (err, css) => {
    postcss([])
        .process(css, { syntax: scss })
        .then((result: any) => {
            for (let node of result.root.nodes) {
                const elmNodes = convertNode(node)
                elmNodes.map(elmNode => console.log(elmNodeToString(elmNode)))
            }
        })
})
