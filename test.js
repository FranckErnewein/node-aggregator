var expect = require('chai').expect;
var Aggregator = require('./');

describe('Aggregator', function() {

  function lambda() {}

  it('should create an instance', function() {
    var agg = new Aggregator(lambda);
    expect(agg).to.be.instanceof(Aggregator);
  });

  it('should throw an error when there is no aggregator function', function() {
    expect(function() {
      new Aggregator();
    }).to.throw('aggregator is not a function');
  });

  it('should aggregate a string', function() {
    var string_concat = new Aggregator(function(value, mem) {
      return mem + value;
    }, '');
    string_concat.add('h');
    string_concat.add('i');
    expect(string_concat.get()).to.be.equal('hi');
  });

  it('#add() and #aggregate() should retrun the last aggregation value', function() {
    var word_concat = new Aggregator(function(value, mem) {
      return mem === null ? value : mem + ' ' + value;
    }, null);
    expect(word_concat.add('hello')).to.be.equal('hello');
    expect(word_concat.add('world')).to.be.equal('hello world');
    expect(word_concat.aggregate('!')).to.be.equal('hello world !');
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
    var async_init = new Aggregator(function() {}, function(done) {
      setTimeout(function() {
        done(42);
      }, 10);
    });
    setTimeout(function() {
      expect(async_init.get()).to.be.equal(42);
      done();
    }, 20);
  });

  it('should bufferise some value before initializing', function(done) {
    var bufferized = new Aggregator(function(val, mem) {
      return mem + val;
    }, function(init) {
      setTimeout(function() {
        init(0);
        expect(bufferized.get()).to.be.equal(3);
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
    setTimeout(function() {
      expect(bufferized.get()).to.be.equal(3); //check aggregation
      expect(bufferized._buffer).to.has.length(0); //check buffer is now empty
      done();
    }, 20);
  });

  it('should aggregate with an async function', function(done) {
    var async = new Aggregator(function(val, mem, cb) {
      setTimeout(function() {
        cb(mem + val);
      }, 10);
    }, 0);

    async.add(1);
    expect(async.get()).to.be.equal(0);
    setTimeout(function() {
      expect(async.get()).to.be.equal(1);
      done();
    }, 20);
  });

  it('should stack in buffer if add() called too fast', function(done) {

    var async = new Aggregator(function(val, mem, cb) {
      setTimeout(function() {
        cb(mem + val);
      }, 1);
    }, 0);

    async.add(1);
    async.add(2);
    expect(async.get()).to.be.equal(0);
    expect(async._buffer).to.has.length(1);
    setTimeout(function(){
      expect(async.get()).to.be.equal(3);
      expect(async._buffer).to.has.length(0);
      done();
    }, 10);
  });

});
