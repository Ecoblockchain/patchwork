var pull = require('pull-stream')
var pullCat = require('pull-cat')
var computed = require('mutant/computed')
var MutantPullReduce = require('mutant-pull-reduce')
var throttle = require('mutant/throttle')
var nest = require('depnest')
var hr = 60 * 60 * 1000

exports.needs = nest({
  'sbot.pull.feed': 'first'
})

exports.gives = nest('profile.obs.recentlyUpdated')

exports.create = function (api) {
  var instance = null

  return nest('profile.obs.recentlyUpdated', function () {
    load()
    return instance
  })

  function load () {
    if (instance) return

    var stream = pull(
      pullCat([
        api.sbot.pull.feed({reverse: true, limit: 4000}),
        api.sbot.pull.feed({old: false})
      ])
    )

    var result = MutantPullReduce(stream, (result, msg) => {
      if (msg.value.timestamp && Date.now() - msg.value.timestamp < (7 * 24 * hr)) {
        result.add(msg.value.author)
      }
      return result
    }, {
      startValue: new Set(),
      nextTick: true
    })

    instance = throttle(result, 2000)
    instance.sync = result.sync

    instance.has = function (value) {
      return computed(instance, x => x.has(value))
    }
  }
}
