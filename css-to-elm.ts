import postcss from 'postcss'
import scss from 'postcss-scss'
import * as fs from 'fs'

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
                children.push(...convertNode(child))
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
        .join('\n    , ')

    const text = `
${node.name} : Style
${node.name} =
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
