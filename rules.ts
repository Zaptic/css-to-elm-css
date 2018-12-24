import postcss from 'postcss'
import * as _ from 'lodash'

export interface ElmDecl {
    name: string
    values: string[]
}

function suffix(name: string, count: number) {
    if (count <= 1) {
        return name
    }
    return `${name}${count}`
}

function translateValue(value: string) {
    if (/.*px/.test(value)) {
        return `(px ${value.replace('px', '')})`
    } else if (/.*em/.test(value)) {
        return `(em ${value.replace('em', '')})`
    } else if (/.*%/.test(value)) {
        return `(pct ${value.replace('%', '')})`
    } else if (/#.*/.test(value)) {
        return `(hex "${value.replace('#', '')}")`
    } else if (/\$.*/.test(value)) {
        return _.camelCase(value.replace('$', ''))
    }
    return value
}

function display(node: postcss.Declaration): ElmDecl {
    if (node.value === 'flex') {
        return { name: 'displayFlex', values: [] }
    }
    return { name: 'display', values: [node.value] }
}

export function standard(node: postcss.Declaration) {
    const args = node.value.split(' ')
    const values = args.map(translateValue)
    return { name: suffix(_.camelCase(node.prop), values.length), values }
}

type Lookup = { [key: string]: (node: postcss.Declaration) => ElmDecl }

export const lookup: Lookup = {
    display,
}
