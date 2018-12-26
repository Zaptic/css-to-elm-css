import postcss from 'postcss'
import * as _ from 'lodash'

export interface Config {
    replacements: { [key: string]: string }
}

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

const builtInReplacements: { [key: string]: string } = {
    nowrap: 'noWrap',
    '0': 'zero',
    '1': '(int 1)',
    '-': 'minus',
    '+': 'plus',
}

function translateValue(value: string, config: Config) {
    const replacements = {
        ...builtInReplacements,
        ...config.replacements,
    }

    if (replacements[value] !== undefined) {
        return replacements[value]
    } else if (/.*px/.test(value)) {
        return `(px ${value.replace('px', '')})`
    } else if (/.*em/.test(value)) {
        return `(em ${value.replace('em', '')})`
    } else if (/.*vw/.test(value)) {
        return `(vw ${value.replace('vw', '')})`
    } else if (/.*vh/.test(value)) {
        return `(vh ${value.replace('vh', '')})`
    } else if (/.*%/.test(value)) {
        return `(pct ${value.replace('%', '')})`
    } else if (/#.*/.test(value)) {
        return `(hex "${value.replace('#', '')}")`
    } else if (/\$.*/.test(value)) {
        return _.camelCase(value.replace('$', ''))
    } else if (/[a-z]-[a-z]/.test(value)) {
        // If the value is a string with a dash in it like 'space-between' then camelCase it
        return _.camelCase(value)
    }
    return value
}

function display(node: postcss.Declaration, config: Config): ElmDecl {
    if (node.value === 'flex') {
        return { name: 'displayFlex', values: [] }
    }
    return { name: 'display', values: [_.camelCase(node.value)] }
}

export function flex(node: postcss.Declaration, config: Config) {
    const args = node.value.split(' ')

    // Drop 'auto' entries from the end as Elm Css seems to consider them redundant
    const values = _.dropRightWhile(args, arg => arg === 'auto').map(value => translateValue(value, config))
    return { name: suffix(_.camelCase(node.prop), values.length), values }
}

export function standard(node: postcss.Declaration, config: Config) {
    const match = node.value.match(/^calc\((.*)\)/)
    if (match && match.length) {
        const values = match[1].split(' ').map(value => translateValue(value, config))
        return { name: node.prop, values: ['<|', 'calc', ...values] }
    } else {
        const args = node.value.split(' ')
        const values = args.map(value => translateValue(value, config))
        return { name: suffix(_.camelCase(node.prop), values.length), values }
    }
}

type Lookup = { [key: string]: (node: postcss.Declaration, confg: Config) => ElmDecl }

export const lookup: Lookup = {
    display,
    flex,
}
