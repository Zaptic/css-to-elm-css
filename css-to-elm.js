const postcss = require('postcss');
const scss = require('postcss-scss');
const fs = require('fs');

function outputNode(node) {
  if (node.type === 'rule') {
    const text = `
${node.selector} : Style
${node.selector} =
    Css.batch [
`;

    console.log(text);

    for (let child of node.nodes) {
      outputNode(child);
    }

    console.log(`    ]`);
  } else if (node.type === 'decl') {
    if (node.prop === 'border') {
      const values = node.value.split(' ');
      console.log(`    border${values.length} ${node.value}`);
    }
  }
}

fs.readFile('./View.cssm.scss', (err, css) => {
  postcss([])
    .process(css, {syntax: scss})
    .then(result => {
      for (let node of result.root.nodes) {
        outputNode(node);
        // console.log(JSON.stringify(node, null, 2));
      }
    });
});
