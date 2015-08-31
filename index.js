var events = require('events');
var util = require('util');

util.inherits(Aggregator, events.EventEmitter);

function Aggregator(aggregator, initial_value) {
  events.EventEmitter.call(this);

  this._buffer = [];
  this._ready = false;
  this._processing = false;

  if (arguments.length > 0) {
    factory.call(this, aggregator, initial_value);
  }else{
    this._init();
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

function aggregatorNotImplemtented() {
  throw new Error('aggregator not implemented');
}

Aggregator.prototype._init = _init;
Aggregator.prototype._unstack = _unstack;

Aggregator.prototype.aggregate = aggregate;
Aggregator.prototype.add = aggregate;
Aggregator.prototype.write = aggregate;
Aggregator.prototype.aggregator = aggregatorNotImplemtented;

Aggregator.prototype.value = get;
Aggregator.prototype.get = get;
Aggregator.prototype.read = get;

function factory(aggregator, initial_value) {
  var agg = (this instanceof Aggregator) ? this : new Aggregator();

  if (typeof aggregator !== 'function') {
    throw new Error('aggregator is not a function');
  }

  if (aggregator.length === 2) {
    agg.aggregator = function(value, mem, cb) {
      cb(aggregator(value, mem));
    };
  } else {
    agg.aggregator = aggregator;
  }

  if (typeof initial_value === 'function') {
    if (initial_value.length === 1) {
      //aync init
      initial_value(_init.bind(agg));
    } else {
      agg._init(initial_value());
    }
  } else {
    agg._init(initial_value);
  }

  return agg;
}

Aggregator.create = factory;

module.exports = Aggregator;
