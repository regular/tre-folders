const h = require('mutant/html-element')
const MutantArray = require('mutant/array')
const MutantMap = require('mutant/map')
const computed = require('mutant/computed')
const collectMutations = require('collect-mutations')
const setStyle = require('module-styles')('tre-folders')
const pull = require('pull-stream')

function renderName(kv, ctx) {
  const c = kv.value && kv.value.content
  const {name} = c
  return h('div.name', name)
}

function renderDefaultTileContent(kv, ctx) {
  if (!kv) return []
  const c = kv.value && kv.value.content
  const {type} = c
  return h('div', {
    style: {
      background: '#333',
    }
  }, type)
}

module.exports = function (ssb, opts) {
  const renderTileContent = opts.renderTile || renderDefaultTileContent

  _setStyle()

  function branches(kv) {
    return ssb.revisions.messagesByBranch(revisionRoot(kv), {live: true, sync: true})
  }

  function renderTile(kv, ctx) {
    if (!kv) return []
    const primarySelection = ctx.primarySelection || Value()
    const secondarySelections = ctx.secondarySelections || Value([])
    function selected() {
      const sels = secondarySelections()
      return sels.find(sel=>revisionRoot(sel) == revisionRoot(kv))
    }
    return h('.tile', {
      classList: computed(secondarySelections, sels =>{
        return selected() ? ['selected'] : []
      }),
      'ev-dblclick': ev => {
        primarySelection.set(kv)
      },
      'ev-click': ev => {
        const l = secondarySelections().length
        if (l == 1 && revisionRoot(secondarySelections()[0]) == revisionRoot(kv)) {
          return secondarySelections.set([])
        }
        if (ev.ctrlKey) {
          if (selected()) {
            secondarySelections.set(secondarySelections().filter(sel=>revisionRoot(sel) !== revisionRoot(kv)))
          } else {
            secondarySelections.set(secondarySelections().concat([kv]))
          }
          return
        }
        secondarySelections.set([kv])
      }
    },
    [h('.background')].concat(
      [renderTileContent(kv, Object.assign({}, ctx, {
        where: 'tile'
      }))].concat([
        renderName(kv)
      ]))
    )
  }

  return function renderFolder(kv, ctx) {
    if (!kv) return []
    const content = kv.value && kv.value.content
    if (content.type !== 'folder') return
    if (ctx.where !== 'editor') return

    const source = opts.source || branches
    const RenderList = opts.listRenderer || DefaultRenderList

    const children = MutantArray()
    const has_children = computed(children, c => c.length !== 0)
    const drain = collectMutations(children, {sync: opts.sync})

    function DefaultRenderList(opts) {
      return function(list, ctx) {
        return h('ul', MutantMap(list, m => {
          if (!m) return []
          const item = opts.renderItem(m(), ctx)
          return h('li', item) 
        }, {
          comparer: (a, b) => a===b,
          maxTime: opts.maxTime
        } ))
      }
    }

    function renderChildren() {
      const newCtx = Object.assign({}, ctx, {
        path: (ctx && ctx.path || []).concat(kv)
      })
      return RenderList({
        renderItem: renderTile
      })(children, newCtx)
    }

    pull(source(kv), drain)

    const el = h('.tre-folders', {
      classList: computed(has_children, hc => hc ? 'children' : 'no-children'),
      hooks: [el => function release() {
        drain.abort()
      }],
    }, renderChildren())
    return el
  }
}

module.exports.factory = factory
  
function factory() {
  const type = 'folder'
  return {
    type,
    i18n: {
      'en': 'Folder'
    },
    content: function() {
      return {
        type
      }
    }
  }
}

// -- utils

function revisionRoot(kv) {
  return kv.value.content && kv.value.content.revisionRoot || kv.key
}

function _setStyle() {
  setStyle(`
    .tre-folders > ul {
      display: grid;
      grid-template-columns: repeat(auto-fill, 72px);
      grid-auto-rows: 72px;
      grid-auto-flow: row;
      padding: 6px;
      grid-gap: 6px;
      place-items: stretch;
      place-content: start;
    }
    .tre-folders > ul > li {
      list-style-type: none;
    }
    .tre-folders .tile {
      width: 100%;
      height: 100%;
      padding: 0;
      display: grid;
      grid-template-rows: 18px 1fr 28px;
      grid-template-columns: 100%;
      overflow: hidden;
      place-items: stretch;
      place-content: stretch;
    }
    .tre-folders .tile.selected {
      box-shadow: 0 0 5px var(--tre-secondary-selection-color)
    }
    .tre-folders .tile > .background {
      height: 100%;
      width: 100%;
      grid-column: 1 / 2;
      grid-row: 1 / 4;
      background-color: transparent;
    }
    .tre-folders .tile.selected > .background {
      background-color: var(--tre-secondary-selection-color);
    }
    .tre-folders .tile > :nth-child(2) {
      grid-column: 1 / 2;
      grid-row: 1 / 3;
      margin: auto;
    }
    .tre-folders .tile > .name {
      place-self: center;
      margin: auto;
      height: 100%;
      grid-column: 1 / 2;
      grid-row: 3 / 4;
      display: inline;
      width: 100%;
      word-wrap: break-word;
      text-align: center;
    }
  `)
}
