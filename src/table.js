
var pluginManager = require('./plugin-manager.js')
  , Constrainer = require('./constrainer.js')
  , _prepareConf = pluginManager.prepareConf
  , _prepareInstance = pluginManager.prepareInstance
  , _uindex = Date.now() | 0
  , _TableMethods = {
    toArray: Array.prototype.slice
    , toString: function () { return '[table Table]' }
    , deref: _deref
    , clone: _clone
    , copy: _copy
    , deepCopy: _deepCopy
    , extract: _extract
    , find: _find
    , findForEach: _findForEach
    , findRS: _findRS
    , findForEachRS: _findForEachRS
    , remove: _remove
    , removeRS: _removeRS
    , move: _remove   // alias
    , drop: _drop
    , constrain: _constrain
  }

/** Table array manager
  * 
  * @module Table
  */
; module.exports = Table

; Object.defineProperty(Table, 'ResultSet', {
  value: ResultSet, enumerable: true
})

; pluginManager.inherits(Table, Array, _TableMethods, true)

; pluginManager.inherits(ResultSet, Array, {})

/**
  * Table constructor / Array wrapper
  * 
  * @constructor
  * @param {?array|string}   data    - data object or json to import
  * @param {?string}  name    - table name
  * @param {?conf}    conf    - confiration info
  */
function Table (data, name, conf) {
  var isWrapper = ! (this instanceof Table)
    , this_ = isWrapper ? (data instanceof Array ? data : []) : this
    , i = arguments.length - 1
    , conf = (i && arguments[i] instanceof Object) ? arguments[i--] : {}
    , parser, stringifier, constraint
  ; parser = (conf.parser instanceof Function) && conf.parser
  ; stringifier = (conf.stringifier instanceof Function)
      ? conf.stringifier : _stringifier
  ; constraint = (conf.constraint instanceof Object) ? conf.constraint : null
  ; Object.defineProperty(this_, 'name', {
    name: {
      value: (i && typeof arguments[i] === 'string' && arguments[i--])
        || conf.name || ('unnamed-' + new Buffer(++_uindex + '').toString('hex'))
      , enumerable: false, configurable: true, writable: true
    }
  })
  ; pluginManager.extend(this_, {
    parse: function _parse (json, cb) {
      return _clone.call(JSON.parse(json, cb || parser), this)
    }
    , stringify: function _stringify (cb) {
      return JSON.stringify(this, cb || stringifier)
    }
  }, false)
  ; if (isWrapper) pluginManager.extend(this_, _TableMethods, true)
  ; if (data && data !== this_) {
    if (typeof data === 'string') data = JSON.parse(data, parser)
    ; _clone.call(data, this_)
  }
  return this_
}

/**
  * Table.wrap Array wrapper
  * 
  * @memberof module:Table
  * @function
  * @param {?object}   data    - data object or json to import
  * @param {?string}  name    - table name
  * @param {?conf}    conf    - confiration info
  * @returns {Table}    - the table wrapper array
  * @see class:Table
  */
function wrap (array, name, conf) {
  return Table(array, name, conf)
}

/**
  * Table#constrain Array wrapper
  * 
  * @method
  * @returns {Table}    - the table wrapper array
  * @see class:Table
  */
function _constrain () { // hook
  return this
}

function _stringifier (key, val) {
  return (val instanceof Table) ? val.slice() : val
}

function _deref (this_) {
  this_ || (this_ = this)
  ; return new Table(this_.stringify(), this_.name)
}

function _clone (result) {
  var i, r
  ; i = (result || (result = [])).length
  // ; for (r of this) if (r) result[i++] = r
  ; for (var j in this) if (r = this[j]) result[i++] = r
  ; return result
}

function _copy (result) {
  var i, k, o, r
  ; i = (result || (result = [])).length
  // ; for (o of this) {
  ; for (var j in this) {
    ; if (o = this[j]) {
      result[i++] = r = {}
      ; for (k in o) r[k] = o[k]
    }
  }
    ; return result
}

function _deepCopy (result) {
  var i, k, o, r
  ; i = (result || (result = [])).length
  // ; for (o of this) {
  ; for (var j in this) {
    ; if (o = this[j]) {
      ; result[i++] = r = {}
      ; for (k in o) r[k] = o[k]
    }
  }
    ; return result
}

function _extract (q, cb) {
  var result = []
    , i = 0
    , r, s
  ; cb instanceof Function || (cb = function (r) { return r })
  // ; for (r of this) if (s = cb(r)) result[i++] = s
  ; for (var j in this) if (s = cb(r = this[j])) result[i++] = s
  ; return result
}

function _find (q) {
  var result = []
    , j = 0
    , b, k, r
  ;
  // for (r of this) {
  for (var l in this) {
    if (! (r = this[l])) continue
    ; b = false
    ; for (k in q) if (b = (r[k] !== q[k])) break
    ; if (!b) result[j++] = r
  }
  return result.length ? result : null
}

function _findRS (q) {
  var result = new ResultSet(this)
    , x = result.index
    , b, i, j, k, r
  ;
  for (i in this) {
    ; if (isNaN(i) || ! (r = this[i])) continue
    ; b = false
    ; for (k in q) if (b = (r[k] !== q[k])) break
    ; if (!b) {
      ; x[result.push(r)-1] = i
    }
  }
  return result.length ? result : null
}

function _findForEach (cb, q, this_) {
  var result = []
    , i = 0
    , b, k, r
  ; this_ || (this_ = this)
  ; if (q instanceof Object) {
    // ; for (r of this) {
    ; for (var j in this) {
      if ( ! ((r = this[j]) && r instanceof Array)) continue
      b = true
      for (k in q) if (b = (r[k] !== q[k])) break
      if (!b && (b = cb.call(this_, r, i)) != null) result[i++] = b
    }
  } else {
    // ; for (r of this) {
    ; for (var j in this) {
      if ((r = this[j]) && r instanceof Array && (b = cb.call(this_, r, i)) != null) result[i++] = b
    }
  }
  return result
}

function _remove (q, dst) {
  var j = (dst || (dst = this instanceof Table ? new Table : [])).length
    , b, i, k, r
  ; if (isNaN(j)) throw new Error('cannot move to destination that is not array-like')
  ; for (i in this) {
    if (! (r = this[i])) continue
    for (k in q) if (b = (r[k] !== q[k])) break
    ; if (!b ) {
      dst[j++] = r
      ; this[i] = null
    }
  }
  return dst
}

function _removeRS (q, dst) {
  var b, i, j, k, r
  ; if (dst) {
    if ( ! (dst instanceof ResultSet && rst.source === this)) {
      throw new Error('cannot move to non ResultSet or ResultSet from different Table')
    }
  } else dst = new ResultSet(this)
  ; j = dst.length
  ; for (i in this) {
    if (! (r = this[i])) continue
    for (k in q) if (b = (r[k] !== q[k])) break
    ; if (!b ) {
      dst[j++] = r
      ; this[i] = null
    }
  }
  return dst


  var result = new ResultSet(this)
    , x = result.index
    , j = 0
    , b, i, k, r
  ; result.index = x
  ;
  // for (r of this) {
  for (i in this) {
    if (! (r = this[i])) continue
    for (k in q) if (b = (r[k] !== q[k])) break
    ; if (!b ) {
      result[j] = r
      ; x[j++] = i
      ; this[i] = null
    }
  }
  return result
}

function _drop (q) {
  var n = 0
    , b, i, k, r
  ;
  for (i in this) {
    if (! (r = this[i])) continue
    for (k in q) if (b = (r[k] !== q[k])) break
    ; if (!b) {
      n++
      ; this[i] = null
    }
  }
  return n
}

function _findForEachRS (cb, q, this_) {
  var result, b, i, j, k, r, x
  ; if (this_ instanceof Function) {
    cb = this_ ; this_ = this
  } else this_ || (this_ = this)
  ; result = new ResultSet(this_)
  ; x = result.index
  ; j = 0
  ; if (q instanceof Object) {
    ; for (i in this_) {
      if (isNaN(i) || ! (r = this_[i])) continue
      ; b = true
      ; for (k in q) if (b = (r[k] !== q[k])) break
      ; if (!b && (b = cb.call(this_, r, i)) != null) {
        // console.log('_findForEachRS', k, r[k] !== q[k])
        ; result[j] = b
        ; x[j++] = i
      }
    }
  } else {
    // ; for (r of this) {
    ; for (var l in this) {
      if ((r = this[l]) && r instanceof Array && (b = cb.call(this_, r, i)) != null) result[i++] = b
    }
  }
  return result
}

function ResultSet (source) {
  if ( ! (this instanceof ResultSet)) throw new Error('constructor called as function')
  if ( ! (source instanceof Array)) throw new Error('Table or Array expected (first argument)')
  ; this.source = source
  ; this.index = []
}

