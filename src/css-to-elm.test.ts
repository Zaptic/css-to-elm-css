import { convertCss } from './css-to-elm'
import { defaultConfig } from './config'

test('converts an empty string', async () => {
    expect(await convertCss('', defaultConfig)).toBe('')
})

test('basic class selector', async () => {
    const input = `
.myButton {
    color: white;
}
    `
    expect(await convertCss(input, defaultConfig)).toMatchSnapshot()
})

test('nested class selectors', async () => {
    const input = `
.myButton {
    color: white;

    .myButtonDetail {
        color: black;
    }
}
    `
    expect(await convertCss(input, defaultConfig)).toMatchSnapshot()
})
