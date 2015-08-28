var events = require('events');
var util = require('util');

util.inherits(Aggregator, events.EventEmitter);

function Aggregator(aggregator, initial_value) {
  events.EventEmitter.call(this);

  if (typeof aggregator !== 'function') {
    throw new Error('aggregator is not a function');
  }

  this._buffer = [];
  this._ready = false;
  this._processing = false;

  if (aggregator.length === 2) {
    this.aggregator = function(value, mem, cb) {
      cb(aggregator(value, mem));
    };
  } else {
    this.aggregator = aggregator;
  }

  if (typeof initial_value === 'function') {
    if (initial_value.length === 1) {
      //aync init
      initial_value(_init.bind(this));
    } else {
      this._init(initial_value());
    }
  } else {
    this._init(initial_value);
  }

}



function _init(val) {
  this._aggregated = val;
  this._ready = true;
  this.emit('ready', this.get());
  this._unstack();
}

function _onAggregate(new_value) {
  this._aggregated = new_value;
  this._processing = false;
  this.emit('data', new_value);
  this._unstack();
}

function _unstack() {
  if (this._ready && this._buffer.length && !this._processing) {
    this._processing = true;
    var next = this._buffer.shift();
    this.aggregator(next, this._aggregated, _onAggregate.bind(this));
  }
}

function aggregate(new_value) {
  this._buffer.push(new_value);
  this._unstack();
}

function get() {
  return this._aggregated;
}


Aggregator.prototype._init = _init;
Aggregator.prototype._unstack = _unstack;

Aggregator.prototype.aggregate = aggregate;
Aggregator.prototype.add = aggregate;

Aggregator.prototype.value = get;
Aggregator.prototype.get = get;


module.exports = Aggregator;
