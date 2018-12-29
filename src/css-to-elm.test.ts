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

test('readme content nested', async () => {
    const input = `
.trainingWorkflows {
    padding: 30px 20px;
    text-align: center;

    width: $workflow-column-width;

    background-color: #f8fbff;

    border-right: 1px solid $zaptic-grey-6;

    h2 {
        font-size: 16px;
        padding: 25px 20px 20px 20px;
        margin: 0;
        border-bottom: 1px solid $zaptic-grey-5;
    }

    > ul {
        padding: 0;
        margin: 0;
        width: 100%;
    }
}
    `
    expect(await convertCss(input, { ...defaultConfig, unnest: false })).toMatchSnapshot()
})

test('readme content unnested', async () => {
    const input = `
.trainingWorkflows {
    padding: 30px 20px;
    text-align: center;

    width: $workflow-column-width;

    background-color: #f8fbff;

    border-right: 1px solid $zaptic-grey-6;

    h2 {
        font-size: 16px;
        padding: 25px 20px 20px 20px;
        margin: 0;
        border-bottom: 1px solid $zaptic-grey-5;
    }

    > ul {
        padding: 0;
        margin: 0;
        width: 100%;
    }
}
    `
    expect(await convertCss(input, { ...defaultConfig, unnest: true })).toMatchSnapshot()
})
