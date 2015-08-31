var events = require('events');
var util = require('util');

util.inherits(Aggregator, events.EventEmitter);

function Aggregator(aggregator, initial_value) {
  events.EventEmitter.call(this);

  this._buffer = [];
  this._ready = false;
  this._processing = false;

  if (this.aggregator === aggregatorNotImplemtented) {
    this.attachAggregatorFunction(aggregator);
  }

  if (this.init === initNotImplemtented) {
    this.attachInitFunction(initial_value);
  }

  this.init(this._init.bind(this));
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
    this.aggregator(next, this._aggregated, this._onAggregate.bind(this));
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
  throw new Error('aggregator is not implemented');
}

function initNotImplemtented() {
  throw new Error('init is not implemented');
}

function attachAggregatorFunction(aggregator) {
  if (typeof aggregator !== 'function') {
    aggregatorNotImplemtented();
  }

  if (aggregator.length === 2) {
    this.aggregator = function(value, mem, cb) {
      cb(aggregator(value, mem));
    };
  } else {
    this.aggregator = aggregator;
  }
}

function attachInitFunction(initial_value) {
  if (typeof initial_value === 'function') {
    if (initial_value.length === 1) {
      //aync init
      this.init = function(cb) {
        initial_value(cb);
      };
    } else {
      this.init = function(cb) {
        cb(initial_value());
      };
    }
  } else {
    this.init = function(cb) {
      cb(initial_value);
    };
  }
}

Aggregator.prototype._init = _init;
Aggregator.prototype._unstack = _unstack;
Aggregator.prototype._onAggregate = _onAggregate;

Aggregator.prototype.aggregate = aggregate;
Aggregator.prototype.add = aggregate;
Aggregator.prototype.write = aggregate;

Aggregator.prototype.aggregator = aggregatorNotImplemtented;
Aggregator.prototype.init = initNotImplemtented;

Aggregator.prototype.value = get;
Aggregator.prototype.get = get;
Aggregator.prototype.read = get;

Aggregator.prototype.attachAggregatorFunction = attachAggregatorFunction;
Aggregator.prototype.attachInitFunction = attachInitFunction;

function factory(aggregator, initial_value) {
  return new Aggregator(aggregator, initial_value);
}

Aggregator.create = factory;

module.exports = Aggregator;
