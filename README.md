
# SCSS to Elm CSS

An early-stage experimental project to provide a converter from SCSS to Elm CSS.

It will most likely only ever be 90% useful as manual interventions will always be necessary.

## Usage

```
$ cat ./config.js
module.exports = {
    replacements: {
        '$zaptic-grey-5': 'Color.grey5',
        '$zaptic-grey-7': 'Color.grey7',
        '$zaptic-red': 'Color.red',
    },
    imports: ['import Zap.Style.Color as Color'],
}
$ ./node_modules/.bin/tsc && node built/css-to-elm.js ../elm-project/src/view.scss --config './config.js'
```

The output is printed to standard out.

There are some warnings that are printed from postcss too.

## Tests

You can run `yarn test` to run the tests.

## Example Input & Output

Input SCSS:

```
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
```

Output Elm (after applying elm-format):

```
trainingWorkflows : Style
trainingWorkflows =
    Css.batch
        [ padding2 (px 30) (px 20)
        , textAlign center
        , width workflowColumnWidth
        , backgroundColor (hex "f8fbff")
        , borderRight3 (px 1) solid zapticGrey6
        , Global.descendants <|
            List.singleton <|
                Global.typeSelector "h2"
                    [ fontSize (px 16)
                    , padding4 (px 25) (px 20) (px 20) (px 20)
                    , margin zero
                    , borderBottom3 (px 1) solid zapticGrey5
                    ]
        , Global.descendants <|
            List.singleton <|
                merge [ Global.children, Global.typeSelector "ul" ]
                    [ padding zero
                    , margin zero
                    , width (pct 100)
                    ]
        ]
```
