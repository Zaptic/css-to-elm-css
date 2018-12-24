import postcss from 'postcss'

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
    }
    return value
}

export function border(node: postcss.Declaration): ElmDecl {
    const args = node.value.split(' ')
    const values = args.map(translateValue)
    return { name: suffix('border', values.length), values }
}

export function margin(node: postcss.Declaration): ElmDecl {
    const args = node.value.split(' ')
    const values = args.map(translateValue)
    return { name: suffix('margin', values.length), values }
}

type Lookup = { [key: string]: (node: postcss.Declaration) => ElmDecl }

export const lookup: Lookup = {
    border,
    margin,
}
