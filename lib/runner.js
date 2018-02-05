const { EventEmitter } = require('events');
const path             = require('path');
const Benchmark        = require('benchmark');
const reporters        = require('require-all')(path.resolve(__dirname, 'reporters'));

module.exports = class Runner extends EventEmitter {

  constructor(options, files) {
    super();
    if (arguments.length === 0) {
      throw Error('invalid arguments');
    } else if (arguments.length === 1) {
      files   = options;
      options = {};
    }
    this.files   = Array.isArray(files) ? files : [ files ];
    this.options = Object.assign({
      reporter    : require('./reporters/console'),
      grep        : null,
      delay       : 0,
      minTime     : 0,
      maxTime     : 5,
      progress    : false,
      prettyPrint : false,
      verbose     : false,
    }, options);

    // Initialize reporter.
    if (typeof this.options.reporter === 'string') {
      let { reporter } = this.options;
      try {
        // Try to resolve as a file name.
        this.options.reporter = require(path.resolve(process.cwd(), reporter));
      } catch(e) {
        try {
          // Try to resolve as a built-in reporter.
          this.options.reporter = require(path.resolve(__dirname, 'reporters', reporter));
        } catch(e) {
          throw Error(`unable to successfully resolve reporter '${ reporter }'`);
        }
      }
    }

    if (! (this.options.reporter instanceof Function)) {
      throw Error('`reporter` option not a function');
    }
    this.options.reporter(this);
  }

  run(options) {
    this.emit('run.start');
    this._run(this.files.shift());
  }

  _run(file) {
    // No more files to run?
    if (file === undefined) {
      this.emit('run.complete');
      return;
    }

    // Housekeeping
    this.emit('file.start', file);
    this.suites = [];

    // 😱
    global.suite     = this.addSuite.bind(this);
    global.benchmark = this.addBenchmark.bind(this);

    // Import test file.
    const testFn = require(path.resolve(process.cwd(), file));

    // If the test file exports a factory function, call it to pass the `suite`
    // and `benchmark` functions.
    if (typeof testFn === 'function' && testFn.length === 2) {
      testFn(global.suite, global.benchmark);
    }

    const runSuite = suite => {
      // No more suites to run?
      if (suite === undefined) {
        // Run next file.
        this.emit('file.complete', file);
        return this._run(this.files.shift());
      }

      // Check if suite matches the `grep` pattern (if any).
      if (this.options.grep) {
        let re = new RegExp(this.options.grep, 'i')
        if (! re.test(suite.name)) {
          // No match, start next suite.
          return runSuite(this.suites.shift());
        }
      }
      this.emit('suite.run', suite);
      suite.run({ async : true }).on('complete', () => {
        //this.emit('suite.complete', suite);
        return runSuite(this.suites.shift());
      });
    }

    // No more suites left to run? Run next file.
    if (! this.suites.length) {
      this.emit('file.complete', file);
      return this._run(this.files.shift());
    }
    return runSuite(this.suites.shift());
  }

  addSuite(name, opts, fn) {
    if (typeof name === 'function') {
      fn   = name;
      name = 'Suite#' + (this.suites.length + 1);
      opts = {};
    } else if (typeof opts === 'function') {
      fn   = opts;
      opts = {};
    }

    // Create a new suite
    let suite  = this.suites[this.suites.length] = new Benchmark.Suite(name);
    suite.opts = opts;

    // Register benchmarks and hooks.
    fn();

    // Set up event handlers and start the suite.
    let suites     = this.suites;
    let outputJSON = this.outputJSON;
    let completed  = 0;
    let output     = [];
    suite.on('start', () => {
      this.emit('suite.start', suite);
    }).on('cycle', () => {
      this.emit('suite.cycle', suite);
    }).on('complete', () => {
      this.emit('suite.complete', suite);
    }).on('error', err => {
      this.emit('suite.error', err);
    });
  }

  addBenchmark(name, opts, fn) {
    // Implicitly add a suite when there aren't any yet while defining this benchmark.
    if (this.suites.length === 0) {
      this.addSuite(() => {});
    }
    let suite = this.suites[this.suites.length - 1];

    // Check arguments.
    if (typeof name === 'function') {
      fn   = name;
      name = 'Benchmark#' + (suite.length + 1);
      opts = {};
    } else if (typeof opts === 'function') {
      fn   = opts;
      opts = {};
    }

    // Nothing to do...?
    if (typeof fn !== 'function') return;

    // If fn accepts at least one argument, we'll assume that it takes
    // a callback, making the test asynchronous.
    let isDeferred   = fn.length > 0 || opts.promises === true || suite.opts.promises === true;
    let usesPromises = opts.promises === true || suite.opts.promises === true;

    // Check to see if it returns something that looks like a promise,
    // also making it asynchronous.
    if (! isDeferred) {
      let ret      = fn();
      isDeferred   = usesPromises = ret && ret.then;
      usesPromises = isDeferred;
    }

    // Wrap async tests.
    let func = isDeferred ? deferred => {
      if (usesPromises) {
        fn().then(function() {
          deferred.resolve();
        }).catch(function(e) {
          deferred.benchmark.abort();
        });
      } else {
        fn(function(err) {
          if (err) return deferred.benchmark.abort();
          deferred.resolve();
        });
      }
    } : fn;

    // Add the benchmark function to the suite.
    let runner = this;
    suite.add({
      name       : name,
      defer      : isDeferred,
      fn         : func,
      delay      : Number(this.options.delay),
      minTime    : Number(this.options.minTime),
      maxTime    : Number(this.options.maxTime),
      onStart    : function() { runner.emit('benchmark.start',    this) },
      onComplete : function() { runner.emit('benchmark.complete', this) },
    });
  }
}
