const {client} = require('tre-client')
const Folders = require('.')
const h = require('mutant/html-element')
const setStyle = require('module-styles')('tre-folders-demo')

setStyle(`
  .tre-folders {
    max-width: 800px;
    background-color: #777;
  }
`)

client( (err, ssb, config) => {
  if (err) return console.error(err)

  const renderFolder = Folders(ssb, {
  })

  ssb.revisions.get(config.tre.branches.root, (err, kv) => {
    if (err) return console.error(err)
    document.body.appendChild(
      renderFolder(kv)
    )
  })
})
