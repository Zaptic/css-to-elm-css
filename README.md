
# SCSS to Elm CSS

An early-stage experimental project to provide a converter from SCSS to Elm CSS.

It will most likely only ever be 90% useful as manual interventions will always be necessary.


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

Output Elm:

```
trainingWorkflows : Style
trainingWorkflows =
    Css.batch
        [ padding2 (px 30) (px 20)
        , textAlign center
        , width workflowColumnWidth
        , backgroundColor (hex "f8fbff")
        , borderRight3 (px 1) solid zapticGrey6
        ]


trainingWorkflowsH2 : Style
trainingWorkflowsH2 =
    Css.batch
        [ fontSize (px 16)
        , padding4 (px 25) (px 20) (px 20) (px 20)
        , margin 0
        , borderBottom3 (px 1) solid zapticGrey5
        ]


trainingWorkflowsUl : Style
trainingWorkflowsUl =
    Css.batch
        [ padding 0
        , margin 0
        , width (pct 100)
        ]
```
