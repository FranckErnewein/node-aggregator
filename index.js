function Aggregator(aggregator, initial_value) {
  if (typeof aggregator !== 'function') {
    throw new Error('aggregator is not a function');
  }

  this._buffer = [];
  this._ready = false;
  this._isBusy = false;
  this._isAsyncMode = aggregator.length === 3;

  if (this._isAsyncMode) {
    this.aggregator = function(value, mem) {
      this._isBusy = true;
      aggregator(value, mem, function(new_value) {
        this._aggregated = new_value;
        this._isBusy = false;
        _unstack_buffer.call(this);
      }.bind(this));
    }.bind(this);
  } else {
    this.aggregator = aggregator;
  }

  if (typeof initial_value === 'function') {
    if (initial_value.length === 0) {
      this._aggregated = initial_value();
      this._ready = true;
    } else {
      //aync init
      initial_value(_async_init.bind(this));
    }
  } else {
    this._aggregated = initial_value;
    this._ready = true;
  }
}


function _async_init(val) {
  this._aggregated = val;
  this._ready = true;
  _unstack_buffer.call(this);
}

function _unstack_buffer() {
  if (!this._asyncMode) {
    while (this._buffer.length) {
      this._aggregated = this.aggregator(this._buffer.shift(), this._aggregated);
    }
  } else {
    _unstackLoop.call(this);
  }
}

function _unstackLoop() {
  if (this._buffer.length) {
    this.aggregator(this._buffer.shift(), this._aggregated, _unstackLoop.call(this));
  }
}

function aggregate(new_value) {
  if (this._ready && !this._isBusy) {
    if (!this._isAsyncMode) {
      return this._aggregated = this.aggregator(new_value, this._aggregated);
    } else {
      this.aggregator(new_value, this._aggregated);
    }
  } else {
    this._buffer.push(new_value);
  }
}

function get() {
  return this._aggregated;
}


Aggregator.prototype.aggregate = aggregate;
Aggregator.prototype.add = aggregate;

Aggregator.prototype.value = get;
Aggregator.prototype.get = get;


module.exports = Aggregator;
