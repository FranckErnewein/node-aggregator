var expect = require('chai').expect;
var util = require('util');
var Aggregator = require('./');

describe('Aggregator', function() {

  function lambda() {}

  function sum(v, m, cb) {
    cb(v + m);
  }

  it('should create an instance', function() {
    var agg = new Aggregator(lambda);
    expect(agg).to.be.instanceof(Aggregator);
  });

  it('should create an instance with factory', function() {
    var agg = Aggregator.create(lambda);
    expect(agg).to.be.instanceof(Aggregator);
  });

  it('should throw an error when there is no aggregator function', function() {
    expect(function() {
      Aggregator.create();
    }).to.throw('aggregator is not implemented');
  });

  it('should throw an error if aggregator is not implemented', function() {
    expect(function() {
      new Aggregator();
    }).to.throw('aggregator is not implemented');
  });

  it('should aggregate a string', function() {
    var string_concat = new Aggregator(function(value, mem) {
      return mem + value;
    }, '');
    string_concat.add('h');
    string_concat.add('i');
    expect(string_concat.get()).to.be.equal('hi');
  });

  it('should stack as a capped array', function() {
    var capped = new Aggregator(function(value, mem) {
      mem.push(value);
      if (mem.length > 3) {
        mem.shift();
      }
      return mem;
    }, []);

    capped.add(1);
    expect(capped.get()).to.be.deep.equal([1]);
    capped.add(2);
    expect(capped.get()).to.be.deep.equal([1, 2]);
    capped.add(3);
    expect(capped.get()).to.be.deep.equal([1, 2, 3]);
    capped.add(4);
    expect(capped.get()).to.be.deep.equal([2, 3, 4]);
  });

  it('should be initialize with a synchronous function', function() {
    var sync_init = new Aggregator(lambda, function() {
      return 12;
    });
    expect(sync_init.get()).to.be.equal(12);
  });

  it('should be initialize with a synchronous function even if it returns `undefined`', function() {
    var undefined_sync_init = new Aggregator(lambda, lambda);
    expect(undefined_sync_init.get()).to.be.equal(undefined);
    expect(undefined_sync_init._ready).to.be.equal(true);
  });

  it('should be initialize with an asynchronous function', function(done) {
    var async_init = new Aggregator(lambda, function(cb) {
      setTimeout(function() {
        cb(42);
      }, 10);
    });
    async_init.once('ready', function() {
      expect(async_init._ready).to.be.equal(true);
      expect(async_init.get()).to.be.equal(42);
      done();
    });
  });

  it('should be ready with sync init', function() {
    var agg = new Aggregator(lambda, 0);
    expect(agg._ready).to.be.equal(true);
  });

  it('should trigger `ready` with async init', function(done) {
    var agg = new Aggregator(lambda, function(init) {
      setTimeout(function() {
        init(0);
      }, 10);
    });
    agg.once('ready', function() {
      expect(agg._ready).to.be.equal(true);
      done();
    });
  });

  it('should bufferise some value before initializing', function(done) {
    var bufferized = new Aggregator(function(val, mem) {
      return mem + val;
    }, function(init) {
      setTimeout(function() {
        init(0);
        done();
      }, 10);
    });
    bufferized.add(1);
    expect(bufferized.get()).to.be.equal(undefined);
    bufferized.add(2);
    expect(bufferized.get()).to.be.equal(undefined);
    expect(bufferized._buffer).to.be.deep.equal([1, 2]);
  });

  it('should bufferise and unstack values on ready', function(done) {
    var bufferized = new Aggregator(function(val, mem) {
      return mem + val;
    }, function(init) {
      setTimeout(function() {
        init(0);
      }, 10);
    });
    bufferized.add(1);
    bufferized.add(2);
    var is_ready = false;
    bufferized.on('ready', function() {
      expect(bufferized._buffer).to.has.length(2);
      is_ready = true;
    });
    var times = 0;
    bufferized.on('data', function() {
      times++;
      if (times === 2) {
        expect(bufferized.get()).to.be.equal(3); //check aggregation
        expect(bufferized._buffer).to.has.length(0); //check buffer is now empty
        done();
      }
    });
  });

  it('should aggregate with an async function', function(done) {
    var async = new Aggregator(function(val, mem, cb) {
      setTimeout(function() {
        cb(mem + val);
      }, 10);
    }, 0);

    async.add(1);
    expect(async.get()).to.be.equal(0);
    async.on('data', function() {
      expect(async.get()).to.be.equal(1);
      done();
    });
  });

  it('should aggregate with an async function multiple times', function(done) {
    var async = new Aggregator(function(val, mem, cb) {
      setTimeout(function() {
        cb(mem + val);
      }, 10);
    }, 0);

    async.add(1);
    async.add(2);
    async.add(3);
    expect(async.get()).to.be.equal(0);
    async.once('data', function() {
      expect(async.get()).to.be.equal(1);
      async.once('data', function() {
        expect(async.get()).to.be.equal(3);
        async.once('data', function() {
          expect(async.get()).to.be.equal(6);
          done();
        });
      });
    });
  });

  it('should stack in buffer if add() called too fast', function(done) {

    var async = new Aggregator(function(val, mem, cb) {
      setTimeout(function() {
        cb(mem + val);
      }, 2);
    }, 0);

    async.add(1);
    async.add(2);
    async.add(3);
    expect(async.get()).to.be.equal(0);
    expect(async._buffer).to.has.length(2);
    async.once('data', function() {
      expect(async.get()).to.be.equal(1);
      async.once('data', function() {
        expect(async.get()).to.be.equal(3);
        async.once('data', function() {
          expect(async.get()).to.be.equal(6);
          expect(async._buffer).to.has.length(0);
          done();
        });
      });
    });
  });

  it('should add async faster than the buffer', function(done) {
    var async = new Aggregator(function(val, mem, cb) {
      setTimeout(function() {
        cb(mem + val);
      }, 2);
    }, 0);

    async.add(1);
    expect(async.get()).to.be.equal(0);
    expect(async._buffer).to.has.length(0);
    async.once('data', function() {
      expect(async.get()).to.be.equal(1);
      async.add(2);
      expect(async._buffer).to.has.length(0);
      async.once('data', function() {
        expect(async.get()).to.be.equal(3);
        done();
      });
    });
  });

  describe('extend', function() {

    it('should extend and instanciate', function() {
      util.inherits(Child, Aggregator);

      function Child() {
        Aggregator.call(this);
        this._aggregated = 0;
      }
      Child.prototype.aggregator = sum;
      var child = new Child();
      child.add(1);
      expect(child.get()).to.be.equal(1);
      child.add(2);
      expect(child.get()).to.be.equal(3);
    });

    it('should implement init', function() {
      util.inherits(Child, Aggregator);

      function Child() {
        Aggregator.call(this);
      }
      Child.prototype.init = function(cb) {
        cb(15);
      };
      Child.prototype.aggregator = sum;
      var child = new Child();
      expect(child.get()).to.be.equal(15);
    });

    it('should implement async init', function(done) {
      util.inherits(Child, Aggregator);

      function Child() {
        Aggregator.call(this);
      }
      Child.prototype.init = function(cb) {
        setTimeout(function() {
          cb(15);
        }, 15);
      };
      Child.prototype.aggregator = sum;
      var child = new Child();
      expect(child._ready).to.be.equal(false);
      child.once('ready', function() {
        expect(child._ready).to.be.equal(true);
        expect(child.get()).to.be.equal(15);
        done();
      });
    });

    it('should implement async aggregator', function(done) {
      util.inherits(Child, Aggregator);

      function Child() {
        Aggregator.call(this, null, 1);
      }
      Child.prototype.aggregator = function(v, m, cb) {
        setTimeout(function() {
          cb(v + m);
        }, 10);
      };
      var child = new Child();
      expect(child.get()).to.be.equal(1);
      child.add(2);
      child.add(3);
      child.once('data', function() {
        expect(child.get()).to.be.equal(3);
        child.once('data', function() {
          expect(child.get()).to.be.equal(6);
          done();
        });
      });
    });

    it('should implement async aggregator and async init', function(done) {
      util.inherits(Child, Aggregator);

      function Child() {
        Aggregator.call(this);
      }
      Child.prototype.aggregator = function(v, m, cb) {
        setTimeout(function() {
          cb(v + m);
        }, 10);
      };
      Child.prototype.init = function(cb) {
        setTimeout(function() {
          cb(1);
        }, 15);
      };
      var child = new Child();
      child.add(2);
      child.add(3);
      child.once('ready', function() {
        expect(child.get()).to.be.equal(1);
        child.once('data', function() {
          expect(child.get()).to.be.equal(3);
          child.once('data', function() {
            expect(child.get()).to.be.equal(6);
            done();
          });
        });
      });
    });

  });


});
